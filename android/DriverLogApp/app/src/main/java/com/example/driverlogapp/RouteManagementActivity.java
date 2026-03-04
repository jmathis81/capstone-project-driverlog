package com.example.driverlogapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.*;
import com.google.android.gms.location.*;


import java.io.IOException;

import okhttp3.*;

public class RouteManagementActivity extends AppCompatActivity {

    // Declare variables
    private String fileCheck;
    private String routeID;
    private String summary;

    private String accessToken;

    private Button getLocationBtn;
    private Button historyBtn;
    private ImageButton historyExit;
    private FusedLocationProviderClient locationClient;
    private EditText editText;
    private TextView historyText;
    private static final int LOCATION_PERMISSION_REQUEST = 1001;
    private boolean isRunning;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_route_management);

        editText = findViewById(R.id.editTextText);

        isRunning = false;

        accessToken = getIntent().getStringExtra("accessToken");

        // Initialize Buttons from layout
        getLocationBtn = findViewById(R.id.routeControl);
        historyBtn = findViewById(R.id.history_view);

        // Initialize the location provider client
        locationClient = LocationServices.getFusedLocationProviderClient(RouteManagementActivity.this);

        // Set a click listener for the button
        getLocationBtn.setOnClickListener(v -> routeManagement());

        historyBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                /*PopupWindow popupWindow = new PopupWindow(RouteManagementActivity.this);
                View historyView = getLayoutInflater().inflate(R.layout.history_popup, null);
                historyText = historyView.findViewById(R.id.summary_text);
                historyExit = historyView.findViewById(R.id.exit_history_button);
                String presentable  = summary.replaceAll(",", ",\n\n");
                historyText.setText(presentable);
                popupWindow.setContentView(historyView);
                popupWindow.showAtLocation(view, Gravity.CENTER, 0, 0);
                historyExit.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        popupWindow.dismiss();
                    }
                });*/

                Intent historyIntent = new Intent(RouteManagementActivity.this, HistoryActivity.class);
                historyIntent.putExtra("accessToken", accessToken);
                startActivity(historyIntent);
            }
        });
    }

    // Function to get the current location
    private void routeManagement() {
        // Check if location permission is granted
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // Request permission if not granted
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
            return;
        }

        // initialize variables


        //If block controlling start stopping route and button display
        if (!isRunning) {
            routeID = "";
            isRunning = true;
            getLocationBtn.setText("Stop");
            getLocationBtn.setBackgroundColor(Color.RED);
            //Toast.makeText(this, "Route Started", Toast.LENGTH_SHORT).show();
            //Send blank JSON file with expected headers to backend to start recording route on that end
            routeID = startRoute()[0];
            editText.setText(routeID);
            if (routeID.isEmpty()) {
                Toast.makeText(this, "Route Failed", Toast.LENGTH_SHORT).show();
                isRunning = false;
                getLocationBtn.setText("Start");
                getLocationBtn.setBackgroundColor(Color.parseColor("#246B19"));
            }
            final Object lockObject = new Object();
            final String[] routeFile = {"{ \"points\": [ "};
            LocationRequest locationRequest = LocationRequest.create();
            locationRequest.setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
            locationRequest.setInterval(1000);

            LocationCallback locationCallback = new LocationCallback() {
                @Override
                public void onLocationResult(@NonNull LocationResult locationResult) {
                    for (Location location : locationResult.getLocations()) {
                        if (location != null) {
                            routeFile[0] = routeFile[0].concat("{ \"ts\": " + location.getTime() + ", \"lat\": " + location.getLatitude() + ", \"lon\": " + location.getLongitude() + ", \"speed\": " + location.getSpeed() + " }, ");
                        }
                    }

                }

            };

            locationClient.requestLocationUpdates(locationRequest, locationCallback, null);

            Thread pollingThread =new Thread(() -> {
                long lastSendTime = 0;
                long sendInterval = 1000;

                while (isRunning) {
                    long currentTime = System.currentTimeMillis();

                    if (currentTime - lastSendTime >= sendInterval && routeFile[0].length() > 17) {
                        synchronized (lockObject) {
                            routeFile[0] = routeFile[0].substring(0, routeFile[0].length() - 2);
                            routeFile[0] = routeFile[0].concat(" ] }");
                            fileCheck = routeFile[0];
                            sendRouteData(routeFile[0]);
                            routeFile[0] = "{ \"points\": [ ";
                        }
                        lastSendTime = currentTime;
                    }
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
                locationClient.removeLocationUpdates(locationCallback);
            });
            pollingThread.start();
        }
        else {
            summary = "";
            isRunning = false;
            //Send blank JSON file with expected headers to backend to stop recording route on that end
            summary = stopRoute(routeID)[0];
            getLocationBtn.setText("Start");
            getLocationBtn.setBackgroundColor(Color.parseColor("#246B19"));
            //Toast.makeText(this, "Route Stopped", Toast.LENGTH_SHORT).show();
        }

    }

    private void sendRouteData(String routeFile) {
        if (routeID == null || routeID.isEmpty()) {
            return;
        }
        try {
            OkHttpClient client = new OkHttpClient();

            RequestBody body = RequestBody.create(routeFile, MediaType.parse("application/json"));
            Request request = new Request.Builder()
                    .url("https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/" + routeID + "/points")
                    .header("Authorization", "Bearer " + accessToken)
                    .post(body)
                    .build();
            Response response = client.newCall(request).execute();
            response.close();


        } catch (IOException e) {
            e.printStackTrace();
        }
    }


    public String[] startRoute() {
        final String[] routeID = {""};
        Thread startThread =new Thread(() -> {
            try {
                OkHttpClient client = new OkHttpClient();

                RequestBody body = RequestBody.create("{}", MediaType.parse("application/json"));
                Request request = new Request.Builder()
                        .url("https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/start")
                        .header("Authorization", "Bearer " + accessToken)
                        .post(body)
                        .build();
                Response response = client.newCall(request).execute();
                if (response.isSuccessful()) {
                    ResponseBody responseBody = response.body();
                    if (responseBody != null) {
                        routeID[0] = responseBody.string();
                        routeID[0] = routeID[0].substring(12);
                        routeID[0] = routeID[0].substring(0, routeID[0].length() - 2);
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
        startThread.start();
        try {
            startThread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return routeID;
    }

    public String[] stopRoute(String routeID) {
        Toast.makeText(this, routeID, Toast.LENGTH_SHORT).show();
        final String[] summary = {""};
        editText.setText(fileCheck);
        Thread stopThread =new Thread(() -> {
            try {
                String urlString = "https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/" + routeID + "/end";
                OkHttpClient client = new OkHttpClient();

                RequestBody body = RequestBody.create("{}", MediaType.parse("application/json"));
                Request request = new Request.Builder()
                        .url(urlString)
                        .header("Authorization", "Bearer " + accessToken)
                        .post(body)
                        .build();
                Response response = client.newCall(request).execute();
                if (response.isSuccessful()) {
                    ResponseBody responseBody = response.body();
                    if (responseBody != null) {
                        summary[0] = responseBody.string();
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
        stopThread.start();
        try {
            stopThread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return summary;
    }


    // Handle the result of the permission request
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // If permission is granted, fetch location
            routeManagement();
        } else {
            // If permission is denied, show message
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
        }
    }
}


/*public class MainActivity extends AppCompatActivity {

    // Declare variables
    private FusedLocationProviderClient locationClient;
    private TextView locationText;
    private static final int LOCATION_PERMISSION_REQUEST = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize TextView and Button from layout
        locationText = findViewById(R.id.editTextText);
        Button getLocationBtn = findViewById(R.id.routeControl);

        // Initialize the location provider client
        locationClient = LocationServices.getFusedLocationProviderClient(this);

        // Set a click listener for the button
        getLocationBtn.setOnClickListener(v -> getCurrentLocation());
    }

    // Function to get the current location
    private void getCurrentLocation() {
        // Check if location permission is granted
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // Request permission if not granted
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
            return;
        }


        // Fetch the last known location
        locationClient.getLastLocation().addOnSuccessListener(new OnSuccessListener<Location>() {
            @Override
            public void onSuccess(Location location) {
                //crashed with this line of code, presumably because location is null
                //Toast.makeText(MainActivity.this, "location " + location.getLatitude(), Toast.LENGTH_SHORT).show();
                if (location != null) {
                    // Get latitude and longitude
                    double lat = location.getLatitude();
                    double lon = location.getLongitude();
                    Toast.makeText(MainActivity.this, "location success", Toast.LENGTH_SHORT).show();

                    // Display location in TextView
                    locationText.setText("Latitude: " + lat + "\nLongitude: " + lon);
                }
                else if (location == null) {
                    // Display error message if location is null
                    locationText.setText("Unable to get location");
                }
                else {
                    locationText.setText("Something is wrong");
                }
            }
        });
    }

    // Handle the result of the permission request
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // If permission is granted, fetch location
            getCurrentLocation();
        } else {
            // If permission is denied, show message
            locationText.setText("Location permission denied");
        }
    }
}
*/