package app.pulse.watchhr;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Measures and sends the heart rate in a foreground service (type "health", like workout apps),
 * so it keeps going with the screen off. It shows an ongoing notification with a Stop button and
 * stops itself after MAX_RUN_MS so it can't drain the battery overnight.
 */
public class HeartRateService extends Service implements SensorEventListener {
    static final String DEFAULT_SERVER = "https://pulse-crew-health.onrender.com";
    static final String ACTION_STOP = "app.pulse.watchhr.STOP";
    private static final String CHANNEL = "live-heart-rate";
    /** Stop sending if the sensor has said nothing for this long. */
    private static final long STALE_MS = 60_000;
    /** Safety limit: the service stops itself after 3 hours. */
    private static final long MAX_RUN_MS = 3L * 60 * 60 * 1000;

    /** Read by the screen to show what's happening. */
    static volatile boolean running = false;
    static volatile int latestBpm = 0;
    static volatile String status = "Starting…";

    private volatile String server = DEFAULT_SERVER;
    private volatile int latestAccuracy = 0;
    private volatile long latestAt = 0;
    private volatile String route = "default network";
    private long startedAt = 0;
    private SensorManager sensors;
    private PowerManager.WakeLock wakeLock;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback wifiCallback;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        server = getSharedPreferences("watch-hr", MODE_PRIVATE).getString("server", DEFAULT_SERVER);
        if (running) return START_STICKY;
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(1, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
            } else {
                startForeground(1, notification());
            }
        } catch (RuntimeException e) {
            status = "Can't run in the background: " + e.getMessage();
            stopSelf();
            return START_NOT_STICKY;
        }
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        Sensor heartRate = sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        if (heartRate == null) {
            status = "No heart-rate sensor available to apps on this watch.";
            stopSelf();
            return START_NOT_STICKY;
        }
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pulsehr:live");
        wakeLock.acquire(MAX_RUN_MS);
        useWifi();
        sensors.registerListener(this, heartRate, SensorManager.SENSOR_DELAY_NORMAL);
        running = true;
        startedAt = SystemClock.elapsedRealtime();
        status = "Measuring… keep the watch snug.\n" + server;
        new Thread(new Runnable() {
            @Override
            public void run() {
                sendLoop();
            }
        }, "sender").start();
        return START_STICKY;
    }

    private Notification notification() {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(
            new NotificationChannel(CHANNEL, "Live heart rate", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1,
            new Intent(this, HeartRateService.class).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Pulse HR")
            .setContentText("Sending live heart rate")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(
                Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Stop", stop).build())
            .build();
    }

    /**
     * With the phone connected, Wear OS sends traffic over Bluetooth through the phone. Ask for
     * Wi-Fi and use it while it's there; if it goes away, fall back to the phone's connection.
     */
    private void useWifi() {
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        wifiCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                connectivity.bindProcessToNetwork(network);
                route = "Wi-Fi";
            }

            @Override
            public void onLost(Network network) {
                connectivity.bindProcessToNetwork(null);
                route = "default network";
            }
        };
        NetworkRequest request = new NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();
        try {
            connectivity.requestNetwork(request, wifiCallback);
        } catch (RuntimeException e) {
            wifiCallback = null;
            route = "default network (Wi-Fi request refused)";
        }
    }

    /** The heart-rate sensor only reports changes, so the last reading is re-sent every second. */
    private void sendLoop() {
        while (running) {
            if (SystemClock.elapsedRealtime() - startedAt > MAX_RUN_MS) {
                status = "Stopped after 3 hours. Open the app to start again.";
                stopSelf();
                return;
            }
            int bpm = latestBpm;
            boolean fresh = SystemClock.elapsedRealtime() - latestAt < STALE_MS;
            if (bpm > 0 && fresh) {
                try {
                    post(bpm, latestAccuracy);
                    status = "Live → " + server + "\nvia " + route;
                } catch (Exception e) {
                    String why = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                    status = "Can't reach server via " + route + ": " + why;
                }
            } else if (bpm == 0) {
                status = "Waiting for a reading…\n" + server;
            }
            SystemClock.sleep(1000);
        }
    }

    private void post(int bpm, int accuracy) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(server + "/live/heart-rate").openConnection();
        connection.setConnectTimeout(3000);
        connection.setReadTimeout(3000);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        byte[] body = ("{\"bpm\":" + bpm + ",\"accuracy\":" + accuracy + "}").getBytes(StandardCharsets.UTF_8);
        try (OutputStream out = connection.getOutputStream()) {
            out.write(body);
        }
        int code = connection.getResponseCode();
        connection.disconnect();
        if (code != 200) throw new Exception("HTTP " + code);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        latestAccuracy = event.accuracy;
        boolean noContact = event.accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT;
        latestBpm = noContact ? 0 : Math.round(event.values[0]);
        latestAt = SystemClock.elapsedRealtime();
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        latestAccuracy = accuracy;
        if (accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT) latestBpm = 0;
    }

    @Override
    public void onDestroy() {
        running = false;
        latestBpm = 0;
        if (status.startsWith("Live") || status.startsWith("Measuring") || status.startsWith("Waiting")) {
            status = "Stopped. Open the app to start again.";
        }
        if (sensors != null) sensors.unregisterListener(this);
        if (wifiCallback != null) {
            connectivity.bindProcessToNetwork(null);
            connectivity.unregisterNetworkCallback(wifiCallback);
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }
}
