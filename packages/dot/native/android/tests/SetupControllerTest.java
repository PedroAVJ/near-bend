package org.neardot.client;
public final class SetupControllerTest {
    static final String CODE = "A".repeat(43);
    static final String LINK = "near-dot://setup/pair?code=" + CODE;
    static final SetupController.Evidence READY = new SetupController.Evidence(true,true,true,true,true,true);
    static int checks;
    static void check(boolean ok) { checks++; if(!ok) throw new AssertionError("case " + checks); }
    public static void main(String[] args) {
        SetupController c = new SetupController("android_client_fixture");
        check(c.stage(LINK));
        c.redeem(READY, (code,audience,now) -> {
            check(code.equals(CODE) && audience.equals("android_client_fixture"));
            return new SetupController.Reply(true,"personal",null);
        },1000);
        check(c.state() == SetupController.State.PAIRED && c.dot().equals("personal"));
        check(!c.stage(LINK) && c.state() == SetupController.State.REPLAY);
        for (String bad : new String[]{ LINK+"&code=x", LINK+"#x", LINK+"&callback=https://evil.invalid", LINK.replace("/pair","/other"), LINK.replace("setup","attacker"), LINK.replace("near-dot:","https:"), "near-dot://setup:123/pair?code="+CODE }) check(!new SetupController("android_client_fixture").stage(bad));
        c = new SetupController("android_client_fixture"); c.stage(LINK); c.cancel();
        c.redeem(READY,(code,audience,now) -> { throw new AssertionError("cancelled adapter invoked"); },1000);
        check(c.state() == SetupController.State.CANCELLED);
        for (SetupController.Evidence denied : new SetupController.Evidence[]{
            new SetupController.Evidence(false,true,true,true,true,true),
            new SetupController.Evidence(true,false,true,true,true,true),
            new SetupController.Evidence(true,true,false,true,true,true),
            new SetupController.Evidence(true,true,true,true,false,true),
            new SetupController.Evidence(true,true,true,true,true,false) }) {
            c = new SetupController("android_client_fixture"); c.stage(LINK);
            c.redeem(denied,(code,audience,now) -> { throw new AssertionError("denied adapter invoked"); },1000);
            check(c.state() == SetupController.State.DENIED);
        }
        c = new SetupController("android_client_fixture"); c.stage(LINK);
        c.redeem(new SetupController.Evidence(true,true,true,false,true,true),(code,audience,now) -> {throw new AssertionError();},1000);
        check(c.state() == SetupController.State.UNAVAILABLE);
        c = new SetupController("android_client_fixture"); c.stage(LINK);
        c.redeem(READY,(code,audience,now) -> new SetupController.Reply(false,null,"expired"),1000);
        check(c.state() == SetupController.State.EXPIRED);
        c = new SetupController("android_client_fixture"); c.stage(LINK);
        c.redeem(READY,(code,audience,now) -> new SetupController.Reply(false,null,"replayed"),1000);
        check(c.state() == SetupController.State.REPLAY);
        final SetupController late = new SetupController("android_client_fixture"); late.stage(LINK);
        late.redeem(READY,(code,audience,now) -> {late.cancel(); return new SetupController.Reply(true,"personal",null);},1000);
        check(late.state() == SetupController.State.CANCELLED && late.dot() == null);
        check(late.stage(LINK)); // local cancellation doesn't consume a server-owned grant
        System.out.println("Android native controller: " + checks + " checks passed");
    }
}
