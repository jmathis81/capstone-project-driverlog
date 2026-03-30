package com.example.driverlogapp;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONObject;

import java.util.Locale;

public class SummaryViewer extends AppCompatActivity {

    ImageButton exitButton;
    TextView routeIDText;
    TextView completedAtText;
    TextView durationText;
    TextView distanceText;
    TextView speedText;


    String routeID;
    String completedAt;
    String duration;
    String distance;
    String speed;

    JSONObject summaryData;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_summary_viewer);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        routeIDText = findViewById(R.id.routeIDText);
        completedAtText = findViewById(R.id.completedAtText);
        durationText = findViewById(R.id.durationText);
        distanceText = findViewById(R.id.distanceText);
        speedText = findViewById(R.id.speedText);

        String summary = getIntent().getStringExtra("summary");
        try {
            summaryData = new JSONObject(summary);
            routeID = summaryData.optString("routeID");
            completedAt = summaryData.optString("completedAt");
            duration = summaryData.optString("durationSeconds");
            distance = summaryData.optString("totalDistanceMiles");
            speed = summaryData.optString("averageSpeedMph");

            routeID = "Route ID: " + routeID;

            completedAt = "Completed At: " + completedAt;

            double durationHours = Double.parseDouble(duration) / 3600;
            double durationMinutes = (Double.parseDouble(duration) % 3600) / 60;
            double durationSeconds = Double.parseDouble(duration) % 60;
            duration = String.format(Locale.getDefault(), "Duration: %d:%02d:%02d", (long)durationHours, (long)durationMinutes, (long)durationSeconds);

            distance = String.format(Locale.getDefault(), "Distance: %.4f miles", Double.parseDouble(distance));
            speed = String.format(Locale.getDefault(), "Speed: %.4f mph", Double.parseDouble(speed));

            routeIDText.setText(routeID);
            completedAtText.setText(completedAt);
            durationText.setText(duration);
            distanceText.setText(distance);
            speedText.setText(speed);
        } catch (Exception e) {
            e.printStackTrace();
        }

        /*
        double durationHours = Double.parseDouble(duration) / 3600;
        double durationMinutes = (Double.parseDouble(duration) % 3600) / 60;
        double durationSeconds = Double.parseDouble(duration) % 60;
        duration = String.format("%.2f:%.2f:%.2f", durationHours, durationMinutes, durationSeconds);

        distance = String.format("%.4f", Double.parseDouble(distance));
        speed = String.format("%.4f", Double.parseDouble(speed));

        routeIDText.setText(routeID);
        completedAtText.setText(completedAt);
        durationText.setText(duration);
        distanceText.setText(distance);
        speedText.setText(speed);

         */

        exitButton = findViewById(R.id.summaryExit);
        exitButton.setOnClickListener(v -> finish());
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }
}