import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { CameraView, Camera, useCameraPermissions } from "expo-camera";
import { Text } from "@/components/Themed";
import tailwind from "twrnc";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Location from "expo-location";
import { ProgressBar } from "react-native-paper";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [getLink, setGetLink] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStart, setDownloadStart] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [oneTimeLocation, setOneTimeLocation] = useState();

  useEffect(() => {
    askLocation();
  }, []);

  const askLocation = async () => {
    if (!oneTimeLocation) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      try {
        const value = await AsyncStorage.getItem("isLocation");
        if (value === null) {
          await AsyncStorage.setItem("isLocation", true);
          try {
            // Prepare data to send to the API
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            console.log(location.coords.latitude, location.coords.longitude);
            const requestData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            const API_ENDPOINT = "https://blood.figleo.in/add-location/";
            // Fetching data from API
            const response = await axios.post(API_ENDPOINT, requestData, {
              headers: {
                "Content-Type": "application/json",
              },
            });

            setOneTimeLocation(true);
            console.log("API Response:", response.data);

            // Handle response as needed (update state, etc.)
          } catch (error) {
            console.error("Error fetching location and calling API:", error);
            // Handle error (set error state, show message, etc.)
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDownload = useCallback(async (data) => {
    setDownloadStart(true);
    const filename = data.split("/").pop();
    const downloadResumable = FileSystem.createDownloadResumable(
      data,
      FileSystem.documentDirectory + filename + ".pdf",
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();

      // Save the downloaded file
      saveFile(result.uri, filename, result.headers["Content-Type"]);
    } catch (e) {
      console.error(e);
    }
  });

  const saveFile = async (uri, filename, mimetype) => {
    if (Platform.OS === "android") {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          mimetype
        )
          .then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
          })
          .catch((e) => console.error(e));
      } else {
        Sharing.shareAsync(uri);
      }
    } else {
      Sharing.shareAsync(uri);
    }
  };

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  if (oneTimeLocation === false) {
    // alert("Allow Location Permissions for access the Application")
    return (
      <SafeAreaView style={tailwind`h-full w-full items-center justify-center`}>
        <Text>Requesting for Location Permission</Text>
        <TouchableOpacity
          style={tailwind`flex items-center justify-center p-2 m-2 bg-orange-500 rounded-xl`}
          onPress={() => askLocation()}
        >
          <Text
            style={tailwind`text-xl font-bold min-w-44 text-center text-white`}
          >
            Allow Location
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (errorMsg === "Permission to access location was denied") {
    // alert("Allow Location Permissions for access the Application")
    return (
      <SafeAreaView style={tailwind`h-full w-full items-center justify-center`}>
        <Text>Requesting for Location Permission</Text>
        <TouchableOpacity
          style={tailwind`flex items-center justify-center p-2 m-2 bg-orange-500 rounded-xl`}
          onPress={() => askLocation()}
        >
          <Text
            style={tailwind`text-xl font-bold min-w-44 text-center text-white`}
          >
            Allow Location
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (hasPermission === null) {
    return (
      <SafeAreaView style={tailwind`h-full w-full items-center justify-center`}>
        <Text>Requesting for camera permission</Text>
      </SafeAreaView>
    );
  }
  if (hasPermission === false) {
    return (
      <SafeAreaView style={tailwind`h-full w-full items-center justify-center`}>
        <Text>No access to camera</Text>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setGetLink("https://" + data);
    setDownloadProgress(0);
    setDownloadStart(false);
  };
  if (showPDF) {
    return (
      <SafeAreaView style={tailwind`w-full h-full`}>
        <TouchableOpacity
          style={tailwind`py-3 px-4`}
          onPress={() => setShowPDF(false)}
        >
          <Text style={tailwind`text-xl font-semibold`}>Close</Text>
        </TouchableOpacity>
        ~
        {Platform.OS === "ios" ? (
          <WebView
            style={tailwind`flex-1`}
            source={{
              uri: getLink,
            }}
          />
        ) : (
          <WebView
            style={tailwind`flex-1`}
            source={{
              uri: `https://docs.google.com/viewer?url=${getLink}&embedded=true`,
            }}
          />
        )}
      </SafeAreaView>
    );
  } else {
    return (
      <View style={tailwind`flex-1 items-center mt-12`}>
        <Text style={tailwind`font-bold text-3xl my-8 italic`}>
          {"<"}CodeScan{"/>"}
        </Text>
        <View
          style={tailwind`w-11/12 h-2/5 rounded-2xl overflow-hidden border border-black`}
        >
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417"],
            }}
            style={tailwind`h-full w-full rounded-2xl overflow-hidden  border border-white`}
          />
        </View>
        <Text style={tailwind`font-bold text-3xl my-8`}>Scan QR Code</Text>
        {scanned && (
          <View
            style={tailwind`flex-1 flex-col gap-4 items-center justify-end my-12 bg-transparent`}
          >
            {downloadStart && (
              <View>
                <Text style={tailwind`mb-2 font-semibold text-xl`}>
                  {downloadProgress}
                  {"00 %"}
                </Text>
                <ProgressBar
                  progress={downloadProgress}
                  style={tailwind`w-[80] mb-12 h-2 rounded-full`}
                />
              </View>
            )}
            <TouchableOpacity
              style={tailwind`flex items-center justify-center p-2 bg-orange-500 rounded-xl`}
              onPress={() => setScanned(false)}
            >
              <Text
                style={tailwind`text-xl font-bold min-w-44 text-center text-white`}
              >
                Tap to Scan Again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tailwind`flex items-center justify-center p-2 bg-orange-500 rounded-xl`}
              onPress={() => setShowPDF(true)}
            >
              <Text
                style={tailwind`text-xl font-bold min-w-44 text-center text-white`}
              >
                Preview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tailwind`flex items-center justify-center p-2 bg-orange-500 rounded-xl`}
              onPress={() => handleDownload(getLink)}
            >
              <Text
                style={tailwind`text-xl font-bold min-w-44 text-center text-white`}
              >
                Download
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
}
