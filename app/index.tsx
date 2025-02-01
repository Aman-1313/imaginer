import React, { useState, useEffect } from 'react';
import {
  View,
  Button,
  Image,
  TextInput,
  Text,
  Platform,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system'; // Import the file system module
import * as Sharing from 'expo-sharing'; // Import the Sharing API

// For web, use react-native-image-picker
import { launchImageLibrary } from 'react-native-image-picker';

// For mobile (Expo), import ImagePicker and ImageManipulator:
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// For web, use the native browser Image constructor
const createWebImage = () => new window.Image();

// Function to resize image on web using canvas
const resizeImageWeb = (imageUri, width, height) => {
  return new Promise((resolve, reject) => {
    const img = createWebImage();
    img.src = imageUri;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = parseInt(width);
      canvas.height = parseInt(height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // Return resized image as base64 string
    };
    img.onerror = (error) => reject(error);
  });
};

// Function to convert image URI to base64 on web (if needed)
const getBase64Image = (uri) => {
  return new Promise((resolve, reject) => {
    const img = createWebImage();
    img.src = uri;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = (error) => reject(error);
  });
};

export default function Index() {
  const [imageUri, setImageUri] = useState(null);
  const [width, setWidth] = useState('100');
  const [height, setHeight] = useState('100');
  const [resizedUri, setResizedUri] = useState(null);

  // Request permissions on mobile using Expo ImagePicker
  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
        }
      })();
    }
  }, []);

  // Use Expo ImagePicker for mobile, and react-native-image-picker for web
  const pickImage = async () => {
    try {
      console.log('Picking image...');

      if (Platform.OS === 'web') {
        console.log('Web platform detected...');
        launchImageLibrary({ mediaType: 'photo' }, (response) => {
          if (response.assets && response.assets[0]) {
            setImageUri(response.assets[0].uri);
            setResizedUri(null);
          } else {
            console.log('No assets found on web');
          }
        });
      } else {
        console.log('Expo ImagePicker for mobile...');
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });

        console.log('ImagePicker result: ', result);

        if (!result.canceled) {
          setImageUri(result.assets[0].uri);
          setResizedUri(null);
        } else {
          console.log('Image picking canceled');
        }
      }
    } catch (error) {
      console.error('Error picking image: ', error);
    }
  };

  const resizeImage = async () => {
    if (imageUri && width && height) {
      try {
        let resizedImageUri;
        if (Platform.OS === 'web') {
          // For web: convert to base64 (if needed) and resize using canvas.
          const base64ImageUri = await getBase64Image(imageUri);
          resizedImageUri = await resizeImageWeb(base64ImageUri, width, height);
        } else {
          // For mobile (Expo): use expo-image-manipulator.
          const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: parseInt(width), height: parseInt(height) } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          resizedImageUri = manipResult.uri;
        }
        setResizedUri(resizedImageUri);
      } catch (error) {
        console.error('Error resizing image:', error);
      }
    }
  };

  // Function to save the resized image to device
  const saveImageToDevice = async () => {
    if (resizedUri) {
      try {
        const fileUri = FileSystem.documentDirectory + 'resized_image.jpg';
        await FileSystem.writeAsStringAsync(fileUri, resizedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert('Image Saved', 'The resized image has been saved to your device.');
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert('Error', 'Failed to save the image.');
      }
    }
  };

  // Function to share the resized image
  const shareImage = async () => {
    if (resizedUri) {
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(resizedUri);
        } else {
          Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        }
      } catch (error) {
        console.error('Error sharing image:', error);
        Alert.alert('Error', 'Failed to share the image.');
      }
    }
  };

  // Function to trigger image download in web
  const downloadImage = () => {
    if (resizedUri && Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = resizedUri;
      link.download = 'resized-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Image Resizer</Text>
      <View style={styles.section}>
        <Button title="Pick an Image" onPress={pickImage} />
      </View>

      {imageUri && (
        <View style={styles.section}>
          <Text style={styles.label}>Original Image</Text>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
          <View style={styles.inputContainer}>
            <TextInput
              value={width}
              onChangeText={setWidth}
              placeholder="Width"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="Height"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Resize Image" onPress={resizeImage} />
          </View>
        </View>
      )}

      {resizedUri && (
        <View style={styles.section}>
          <Text style={styles.label}>Resized Image</Text>
          <Image
            source={{ uri: resizedUri }}
            style={styles.image}
            resizeMode="contain"
          />
          {Platform.OS === 'web' && (
            <View style={styles.buttonContainer}>
              <Button title="Download Image" onPress={downloadImage} />
            </View>
          )}
          {Platform.OS !== 'web' && (
            <View style={styles.buttonContainer}>
              <Button title="Save Image to Device" onPress={saveImageToDevice} />
              <Button title="Share Image" onPress={shareImage} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginHorizontal: 5,
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
  },
});
