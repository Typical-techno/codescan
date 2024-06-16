import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { CameraView, Camera, useCameraPermissions } from "expo-camera";
import { Text } from "@/components/Themed";
import tailwind from "twrnc";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ProgressBar } from "react-native-paper";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [getLink, setGetLink] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStart, setDownloadStart] = useState(false);

  const handleDownload = useCallback(async (data) => {
    setDownloadStart(true);
    const filename = data.split("/").pop();
    const downloadResumable = FileSystem.createDownloadResumable(
      data,
      FileSystem.documentDirectory + filename,
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
      console.log(filename);
      console.log(result.uri);

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
          .catch((e) => console.log(e));
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

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setGetLink(data);
    setDownloadProgress("0");
    setDownloadStart(false);
  };

  return (
    <View style={tailwind`flex-1 items-center mt-12`}>
      <Text style={tailwind`font-bold text-3xl my-8 italic`}>{"<"}CodeScan{"/>"}</Text>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
        style={tailwind`h-5/12 w-9/12 rounded-2xl overflow-hidden  border border-white`}
      />
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
