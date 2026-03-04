package com.example.driverlogapp;

import android.app.Dialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.ImageButton;
import android.widget.ListView;
import android.widget.PopupWindow;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class HistoryActivity extends AppCompatActivity {

    ImageButton exitButton;

    String accessToken;

    List<String> summaryList;
    List<JSONObject> summaryContent;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_history);

        accessToken = getIntent().getStringExtra("accessToken");
        summaryList = new ArrayList<>();
        summaryContent = new ArrayList<>();

        //RecyclerView recyclerView = findViewById(R.id.history_list);

        ListView listView = findViewById(R.id.history_list);

        Thread summaryThread =new Thread(() -> {
            try {
                String urlString = "https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/getsummaries";
                OkHttpClient client = new OkHttpClient();

                Request request = new Request.Builder()
                        .url(urlString)
                        .header("Authorization", "Bearer " + accessToken)
                        .get()
                        .build();
                Response response = client.newCall(request).execute();
                android.util.Log.d("HistoryActivity", "Response code: " + response.code());
                if (response.isSuccessful()) {
                    ResponseBody responseBody = response.body();
                    if (responseBody != null) {
                        String JSONResponse = responseBody.string();
                        parseRouteSummaries(JSONResponse);

                        runOnUiThread(() -> {
                            ArrayAdapter<String> adapter = new ArrayAdapter<>(HistoryActivity.this, android.R.layout.simple_list_item_1, summaryList);
                            /*CustomAdapter adapter = new CustomAdapter(summaryList, new CustomAdapter.OnItemClickListener() {
                                @Override
                                public void onItemClick(int position) {
                                    JSONObject summaryData = summaryContent.get(position);
                                    String summary = summaryData.toString();

                                    Dialog dialog = new Dialog(HistoryActivity.this);
                                    dialog.setContentView(R.layout.history_popup);
                                    Window window = dialog.getWindow();
                                    if (window != null) {
                                        window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                                        WindowManager.LayoutParams layoutParams = window.getAttributes();
                                        layoutParams.width = 350;
                                        layoutParams.height = 450;
                                        window.setAttributes(layoutParams);
                                    }

                                    dialog.show();

                                    TextView historyText = dialog.findViewById(R.id.summary_text);
                                    ImageButton historyExit = dialog.findViewById(R.id.exit_history_button);
                                    historyText.setText(summary);

                                    historyExit.setOnClickListener(v -> dialog.dismiss());
                                }



                                View historyView = getLayoutInflater().inflate(R.layout.history_popup, null);
                                TextView historyText = historyView.findViewById(R.id.summary_text);
                                ImageButton historyExit = historyView.findViewById(R.id.exit_history_button);
                                historyText.setText(summary);

                                PopupWindow popupWindow = new PopupWindow(historyView, 400, 500, true);
                                popupWindow.setOutsideTouchable(true);
                                popupWindow.showAtLocation(findViewById(R.id.main), android.view.Gravity.CENTER, 0, 0);
                                historyExit.setOnClickListener(v -> popupWindow.dismiss());

                                Dialog dialog = new Dialog(HistoryActivity.this);
                                    dialog.setContentView(R.layout.history_popup);
                                    dialog.show();

                                    TextView historyText = dialog.findViewById(R.id.summary_text);
                                    ImageButton historyExit = dialog.findViewById(R.id.exit_history_button);
                                    historyText.setText(summary);

                                    historyExit.setOnClickListener(v -> dialog.dismiss());
                            });*/
                            /*recyclerView.setLayoutManager(new LinearLayoutManager(HistoryActivity.this));
                            recyclerView.setAdapter(adapter);*/
                            listView.setAdapter(adapter);

                            listView.setOnItemClickListener((parent, view, position, id) -> {
                                JSONObject summaryData = summaryContent.get(position);
                                String summary = summaryData.toString();

                                /*Dialog dialog = new Dialog(HistoryActivity.this);
                                dialog.setContentView(R.layout.history_popup);
                                dialog.setCancelable(true);

                                Window window = dialog.getWindow();
                                if (window != null) {
                                    window.setGravity(Gravity.CENTER);
                                    int width = (int) (400 * getResources().getDisplayMetrics().density);
                                    int height = (int) (500 * getResources().getDisplayMetrics().density);
                                    window.setLayout(width, height);
                                }

                                TextView historyText = dialog.findViewById(R.id.summary_text);
                                ImageButton historyExit = dialog.findViewById(R.id.exit_history_button);
                                historyText.setText(summary);
                                historyExit.setOnClickListener(v -> dialog.dismiss());

                                dialog.show();*/
                                Intent summaryIntent = new Intent(HistoryActivity.this, SummaryViewer.class);
                                summaryIntent.putExtra("accessToken", accessToken);
                                summaryIntent.putExtra("summary", summary);
                                startActivity(summaryIntent);

                            });
                        });
                    }
                } else {
                    android.util.Log.e("HistoryActivity", "Response unsuccessful: " + response.code());
                }
            } catch (IOException e) {
                android.util.Log.e("HistoryActivity", "Error fetching summaries", e);
                e.printStackTrace();
            }
        });
        summaryThread.start();

        exitButton = findViewById(R.id.imageButton);
        exitButton.setOnClickListener(v -> finish());





        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }

    private void parseRouteSummaries(String JSONResponse) {
        summaryList.clear();
        try {
            JSONArray jsonArray = new JSONArray(JSONResponse);
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject route = jsonArray.getJSONObject(i);
                String summary = i + ": " + route.getString("completedAt");
                summaryList.add(summary);
                summaryContent.add(route);
                android.util.Log.d("HistoryActivity", "Added: " + summary);
            }
        } catch (Exception e) {
            android.util.Log.e("HistoryActivity", "Error parsing JSON", e);
            e.printStackTrace();
        }
    }
}