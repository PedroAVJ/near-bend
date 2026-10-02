package org.neardot.client;

import java.net.URI;
import java.util.HashSet;
import java.util.Set;

/** Native composition adapter for F setup v1. It never treats an incoming link as authority.
 * Production redemption must delegate to an authenticated deployment's F pairing service. */
public final class SetupController {
    public enum State { EMPTY, PENDING, CANCELLED, PAIRED, EXPIRED, REPLAY, DENIED, UNAVAILABLE }
    public record Evidence(boolean trusted, boolean authenticated, boolean protocolCompatible,
                           boolean reachable, boolean ownerConsent, boolean clientConsent) {}
    public record Reply(boolean accepted, String dotId, String failure) {}
    public interface Redeemer { Reply redeem(String code, String audience, long now); }
    private final String audience;
    public SetupController(String audience) {
        if (audience == null || !audience.matches("[A-Za-z0-9_-]{1,96}")) throw new IllegalArgumentException("Authenticated client audience required");
        this.audience = audience;
    }
    private String code;
    private State state = State.EMPTY;
    private long attempt;
    private String dot;
    private final Set<String> spent = new HashSet<>();
    public State state() { return state; }
    public String dot() { return dot; }
    public boolean stage(String link) {
        // Replacing/cancelling a request invalidates every late callback of the old request.
        attempt++;
        code = null; dot = null;
        try {
            URI u = URI.create(link);
            if (!"near-dot".equals(u.getScheme()) || !"setup".equals(u.getHost()) ||
                !"/pair".equals(u.getRawPath()) || u.getRawUserInfo() != null || u.getPort() != -1 ||
                u.getRawFragment() != null || u.getRawQuery() == null ||
                !u.getRawQuery().matches("code=[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException();
            code = u.getRawQuery().substring(5);
            state = spent.contains(code) ? State.REPLAY : State.PENDING;
            return state == State.PENDING;
        } catch (IllegalArgumentException e) { state = State.DENIED; return false; }
    }
    public void cancel() { attempt++; code = null; dot = null; state = State.CANCELLED; }
    public void redeem(Evidence e, Redeemer backend, long now) {
        if (state != State.PENDING) return;
        if (!(e.trusted && e.authenticated && e.protocolCompatible && e.ownerConsent && e.clientConsent)) {
            state = State.DENIED; return;
        }
        if (!e.reachable) { state = State.UNAVAILABLE; return; }
        long current = attempt;
        Reply reply = backend.redeem(code, audience, now);
        if (current != attempt) return; // cancelled/replaced while adapter was redeeming
        if (reply.accepted && reply.dotId != null && reply.dotId.matches("[A-Za-z0-9_-]{1,96}")) {
            spent.add(code); code = null; dot = reply.dotId; state = State.PAIRED;
        } else if ("expired".equals(reply.failure)) state = State.EXPIRED;
        else if ("replayed".equals(reply.failure)) state = State.REPLAY;
        else state = State.DENIED;
    }
}
