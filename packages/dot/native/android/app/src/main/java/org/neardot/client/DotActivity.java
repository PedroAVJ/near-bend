package org.neardot.client;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.*;

/** Actual native views; offline adapter milestone, never a pretend authenticated connection. */
public final class DotActivity extends Activity {
    private final SetupController setup = new SetupController("unconfigured_android");
    private EditText link;
    private TextView status;
    private CheckBox consent;
    @Override public void onCreate(Bundle saved) { super.onCreate(saved); render(); stageIntent(getIntent()); }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); stageIntent(intent); }
    private void stageIntent(Intent intent) {
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            link.setText(intent.getData().toString()); stage();
        }
    }
    private void stage() {
        consent.setChecked(false);
        setup.stage(link.getText().toString());
        status.setText("Setup: " + setup.state() + ". Incoming links are untrusted; confirm the owner and deployment first.");
        // Clear the bearer code from UI after parsing. It is never logged or persisted.
        link.setText("");
    }
    private void render() {
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(24, 24, 24, 24);
        TextView heading = new TextView(this); heading.setText("Open Dot"); heading.setTextSize(28); layout.addView(heading);
        TextView intro = new TextView(this);
        intro.setText("Android client · offline milestone\nChoose a compatible deployment. Paste the same pairing link shown in a desktop QR. Installation does not authenticate or make a desktop backend reachable."); layout.addView(intro);
        link = new EditText(this); link.setHint("near-dot://setup/pair?code=…"); link.setSingleLine(true);
        link.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        link.setSaveEnabled(false); layout.addView(link);
        Button prepare = new Button(this); prepare.setText("Prepare link"); prepare.setOnClickListener(v -> stage()); layout.addView(prepare);
        consent = new CheckBox(this); consent.setText("I approve pairing with the verified owner and deployment"); layout.addView(consent);
        Button connect = new Button(this); connect.setText("Check connection");
        connect.setOnClickListener(v -> {
            // No production trust/auth/network adapter is installed in this milestone.
            setup.redeem(new SetupController.Evidence(false, false, false, false, false, consent.isChecked()),
                (code, audience, now) -> new SetupController.Reply(false, null, "unavailable"), System.currentTimeMillis());
            status.setText("Deployment trust/authentication, owner confirmation, protocol handshake and network adapter are unavailable. No link was redeemed.");
        }); layout.addView(connect);
        Button cancel = new Button(this); cancel.setText("Cancel / retry with another link"); cancel.setOnClickListener(v -> { setup.cancel(); consent.setChecked(false); link.setText(""); status.setText("Cancelled. Paste a fresh link to retry."); }); layout.addView(cancel);
        status = new TextView(this); status.setText("No deployment selected. QR camera scanning and authenticated MCP UI transport are not installed."); layout.addView(status);
        ScrollView scroll = new ScrollView(this); scroll.addView(layout); setContentView(scroll);
    }
    @Override protected void onDestroy() { setup.cancel(); super.onDestroy(); }
}
