package com.example.driverlogapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.*;
import com.google.android.gms.location.*;
import com.microsoft.identity.client.IAccount;
import com.microsoft.identity.client.AuthenticationCallback;
import com.microsoft.identity.client.IPublicClientApplication;
import com.microsoft.identity.client.ISingleAccountPublicClientApplication;
import com.microsoft.identity.client.IAuthenticationResult;
import com.microsoft.identity.client.PublicClientApplication;
import com.microsoft.identity.client.SilentAuthenticationCallback;
import com.microsoft.identity.client.exception.MsalException;
import com.microsoft.identity.common.java.request.ILocalAuthenticationCallback;


import java.io.IOException;

import okhttp3.*;

public class MainActivity extends AppCompatActivity {

    EditText editText;



    private ISingleAccountPublicClientApplication mSingleAccountApp;
    private String accessToken;
    private static final String[] scopes = {"api://8a653568-903e-4249-aa36-373da6f46ffa/access_as_user"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        editText = findViewById(R.id.editTextText);


        initializeMsal();


    }
    private void initializeMsal() {
        PublicClientApplication.createSingleAccountPublicClientApplication(MainActivity.this, R.raw.auth_config, new IPublicClientApplication.ISingleAccountApplicationCreatedListener() {
            @Override
            public void onCreated(ISingleAccountPublicClientApplication application) {
                mSingleAccountApp = application;
                loadAccount();
            }

            @Override
            public void onError(MsalException exception) {
                Toast.makeText(MainActivity.this, "initialize Error" + exception.getMessage(), Toast.LENGTH_SHORT).show();
                editText.setText(exception.getMessage());
            }
        });
    }

    private void loadAccount() {
        if (mSingleAccountApp == null) return;

        mSingleAccountApp.getCurrentAccountAsync(new ISingleAccountPublicClientApplication.CurrentAccountCallback() {
            @Override
            public void onAccountLoaded(@Nullable IAccount account) {
                if (account != null) {
                    getAccessToken(account);
                } else {
                    signIn();
                }
            }

            @Override
            public void onAccountChanged(@Nullable IAccount priorAccount, @Nullable IAccount currentAccount) {
                if (currentAccount == null) {
                    signIn();
                }
            }

            @Override
            public void onError(MsalException exception) {
                Toast.makeText(MainActivity.this, "loadAccount Error" + exception.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void signIn() {
        if (mSingleAccountApp == null) return;

        mSingleAccountApp.signIn(MainActivity.this, null, scopes, new AuthenticationCallback() {
            @Override
            public void onSuccess(IAuthenticationResult authenticationResult) {
                accessToken = authenticationResult.getAccessToken();
            }

            @Override
            public void onError(MsalException exception) {
                Toast.makeText(MainActivity.this, "signIn Error" + exception.getMessage(), Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onCancel() {
                Toast.makeText(MainActivity.this, "Cancelled", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void getAccessToken(IAccount account) {
        if (mSingleAccountApp == null) return;

        mSingleAccountApp.acquireTokenSilentAsync(scopes, account.getTenantId(), new SilentAuthenticationCallback() {
            @Override
            public void onSuccess(IAuthenticationResult authenticationResult) {
                accessToken = authenticationResult.getAccessToken();
            }

            @Override
            public void onError(MsalException exception) {
                signIn();
            }

        });
    }

    public String getAuthorizationHeader() {
        return "Bearer " + accessToken;
    }

}