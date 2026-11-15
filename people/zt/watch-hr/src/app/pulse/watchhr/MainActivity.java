package app.pulse.watchhr;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * The screen: asks for the sensor permission, starts HeartRateService (which measures and sends,
 * also with the screen off) and shows what it's doing. Change the server with:
 * adb shell am start -n app.pulse.watchhr/.MainActivity --es server https://example.org
 */
public class MainActivity extends Activity {
    private static final String[] PERMISSIONS = {
        "android.permission.BODY_SENSORS", "android.permission.health.READ_HEART_RATE",
        "android.permission.POST_NOTIFICATIONS"
    };
    private static final String[] SENSOR_PERMISSIONS = {
        "android.permission.BODY_SENSORS", "android.permission.health.READ_HEART_RATE"
    };

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView bpmView;
    private TextView statusView;
    private final Runnable refresh = new Runnable() {
        @Override
        public void run() {
            int bpm = HeartRateService.latestBpm;
            bpmView.setText(HeartRateService.running && bpm > 0 ? String.valueOf(bpm) : "--");
            statusView.setText(HeartRateService.status);
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        SharedPreferences prefs = getSharedPreferences("watch-hr", MODE_PRIVATE);
        String fromIntent = getIntent().getStringExtra("server");
        if (fromIntent != null && !fromIntent.isEmpty()) prefs.edit().putString("server", fromIntent).apply();

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.BLACK);
        root.setPadding(28, 28, 28, 28);
        bpmView = text(48, Color.WHITE, "--");
        statusView = text(11, Color.GRAY, "Starting…");
        Button stop = new Button(this);
        stop.setText("Stop");
        stop.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                stopService(new Intent(MainActivity.this, HeartRateService.class));
                finish();
            }
        });
        root.addView(bpmView);
        root.addView(text(14, Color.LTGRAY, "bpm"));
        root.addView(statusView);
        root.addView(stop);
        setContentView(root);

        if (hasSensorPermission()) startMeasuring();
        else requestPermissions(PERMISSIONS, 1);
    }

    private TextView text(float sp, int color, String value) {
        TextView view = new TextView(this);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        view.setText(value);
        return view;
    }

    private boolean hasSensorPermission() {
        for (String permission : SENSOR_PERMISSIONS) {
            if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) return true;
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (hasSensorPermission()) startMeasuring();
        else statusView.setText("Sensor permission denied. Allow it in Settings → Apps → Pulse HR.");
    }

    private void startMeasuring() {
        try {
            startForegroundService(new Intent(this, HeartRateService.class));
        } catch (RuntimeException e) {
            statusView.setText("Couldn't start: " + e.getMessage());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.post(refresh);
    }

    @Override
    protected void onPause() {
        handler.removeCallbacks(refresh);
        super.onPause();
    }
}
