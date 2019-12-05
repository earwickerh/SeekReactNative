// @flow

import React, { Component } from "react";
import {
  Image,
  TouchableOpacity,
  View,
  PermissionsAndroid,
  Text,
  Platform,
  NativeModules,
  Dimensions
} from "react-native";
import CameraRoll from "@react-native-community/cameraroll";
import { NavigationEvents } from "react-navigation";
import { INatCamera } from "react-native-inat-camera";
import RNModal from "react-native-modal";
import moment from "moment";

import LoadingWheel from "../UIComponents/LoadingWheel";
import WarningModal from "./WarningModal";
import i18n from "../../i18n";
import styles from "../../styles/camera/arCamera";
import icons from "../../assets/icons";
import ARCameraHeader from "./ARCameraHeader";
import CameraError from "./CameraError";
import { getTaxonCommonName, checkIfCameraLaunched } from "../../utility/helpers";
import { movePhotoToAppStorage, resizeImage } from "../../utility/photoHelpers";
import { dirPictures, dirModel, dirTaxonomy } from "../../utility/dirStorage";

const { width } = Dimensions.get( "window" );

type Props = {
  +navigation: any
}

class ARCamera extends Component<Props> {
  constructor() {
    super();

    this.state = {
      ranks: {},
      rankToRender: null,
      loading: true,
      predictions: [],
      pictureTaken: false,
      error: null,
      commonName: null,
      showWarningModal: false,
      errorEvent: null,
      focusedScreen: false
    };

    this.toggleWarningModal = this.toggleWarningModal.bind( this );
  }

  setFocusedScreen( focusedScreen ) {
    this.setState( { focusedScreen } );
  }

  setPictureTaken() {
    this.setState( {
      loading: true,
      pictureTaken: true
    } );
  }

  setImagePredictions( predictions ) {
    this.setState( { predictions } );
  }

  setLoading( loading ) {
    this.setState( { loading } );
  }

  setError( error, event ) {
    this.setState( {
      error,
      errorEvent: event || null,
      loading: false
    } );
  }

  handleTaxaDetected = ( event ) => {
    const { rankToRender, loading, pictureTaken } = this.state;
    const predictions = Object.assign( {}, event.nativeEvent );

    if ( pictureTaken ) {
      return;
    }

    if ( predictions && loading === true ) {
      this.setLoading( false );
    }
    let predictionSet = false;
    // not looking at kingdom or phylum as we are currently not displaying results for those ranks
    if ( rankToRender === "species" ) {
      // this block keeps the last species seen displayed for 2.5 seconds
      setTimeout( () => {
        this.resetPredictions();
      }, 2500 );
    } else {
      ["species", "genus", "family", "order", "class"].forEach( ( rank ) => {
        // skip this block if a prediction state has already been set
        if ( predictionSet ) { return; }
        if ( predictions[rank] ) {
          predictionSet = true;
          const prediction = predictions[rank][0];

          this.updateUI( prediction, rank );
        }
        if ( !predictionSet ) {
          this.resetPredictions();
        }
      } );
    }
  }

  handleCameraError = ( event ) => {
    if ( event ) {
      if ( Platform.OS === "ios" ) {
        this.setError( "camera", event.nativeEvent.error );
      } else {
        this.setError( "camera" );
      }
    }
  }

  handleCameraPermissionMissing = () => {
    this.setError( "permissions" );
  }

  handleClassifierError = ( event ) => {
    if ( event ) {
      this.setError( "classifier" );
    }
  }

  handleDeviceNotSupported = ( event ) => {
    if ( event ) {
      this.setError( "device" );
    }
  }

  handleResumePreview = () => {
    if ( this.camera ) {
      this.camera.resumePreview();
    }
  }

  requestAllCameraPermissions = async () => {
    const permissions = PermissionsAndroid.PERMISSIONS;
    const results = PermissionsAndroid.RESULTS;

    if ( Platform.OS === "android" ) {
      const camera = permissions.CAMERA;
      const cameraRollSave = permissions.WRITE_EXTERNAL_STORAGE;
      const cameraRollRetrieve = permissions.READ_EXTERNAL_STORAGE;

      try {
        const granted = await PermissionsAndroid.requestMultiple( [
          camera,
          cameraRollSave,
          cameraRollRetrieve
        ] );

        if ( granted[camera] !== results.GRANTED ) {
          this.setError( "permissions" );
        }

        if ( ( granted[cameraRollRetrieve] || granted[cameraRollSave] ) !== results.GRANTED ) {
          this.setError( "gallery" );
        }
      } catch ( e ) {
        this.setError( "camera" );
      }
    }
  }

  takePicture = async () => {
    if ( Platform.OS === "ios" ) {
      const CameraManager = NativeModules.INatCameraViewManager;
      if ( CameraManager ) {
        try {
          const photo = await CameraManager.takePictureAsync();
          this.savePhoto( photo );
        } catch ( e ) {
          this.setError( "save" );
        }
      }
    } else if ( Platform.OS === "android" ) {
      if ( this.camera ) {
        this.camera.takePictureAsync( {
          pauseAfterCapture: true
        } ).then( ( photo ) => {
          this.savePhoto( photo );
        } ).catch( () => {
          this.setError( "save" );
        } );
      }
    }
  }

  async checkForCameraLaunch() {
    const isFirstCameraLaunch = await checkIfCameraLaunched();
    if ( isFirstCameraLaunch ) {
      this.toggleWarningModal();
    }
  }

  updateUI( prediction, rank ) {
    getTaxonCommonName( prediction.taxon_id ).then( ( commonName ) => {
      this.setState( {
        ranks: {
          [rank]: [prediction]
        },
        commonName,
        rankToRender: rank
      } );
    } );
  }

  resetPredictions() {
    this.setState( {
      ranks: {},
      rankToRender: null,
      commonName: null,
      pictureTaken: false
    } );
  }

  resizeImageForBackup( uri ) {
    resizeImage( uri, width, 250 ).then( ( resizedImage ) => {
      this.saveImageToAppDirectory( uri, resizedImage );
    } ).catch( () => this.navigateToResults( uri ) );
  }

  async saveImageToAppDirectory( uri, resizedImageUri ) {
    try {
      const newImageName = `${moment().format( "DDMMYY_HHmmSSS" )}.jpg`;
      const backupFilepath = `${dirPictures}/${newImageName}`;
      const imageMoved = await movePhotoToAppStorage( resizedImageUri, backupFilepath );

      if ( imageMoved ) {
        this.navigateToResults( uri, backupFilepath );
      } else {
        this.navigateToResults( uri );
      }
    } catch ( e ) {
      this.navigateToResults( uri );
    }
  }

  savePhoto( photo ) {
    this.setImagePredictions( photo.predictions );

    CameraRoll.saveToCameraRoll( photo.uri, "photo" )
      .then( uri => this.resizeImageForBackup( uri ) )
      .catch( () => this.setError( "save" ) );
  }

  navigateToResults( uri, backupUri ) {
    const { predictions } = this.state;
    const { navigation } = this.props;

    const results = {
      time: moment().format( "X" ), // add current time to AR camera photos,
      uri,
      backupUri
    };

    if ( predictions && predictions.length > 0 ) {
      results.predictions = predictions;

      navigation.navigate( "OfflineARResults", results );
    } else {
      navigation.navigate( "OnlineServerResults", results );
    }
  }

  closeCamera() {
    const { navigation } = this.props;

    navigation.navigate( "Main" );
  }

  toggleWarningModal() {
    const { showWarningModal } = this.state;
    this.setState( { showWarningModal: !showWarningModal } );
  }

  render() {
    const {
      ranks,
      rankToRender,
      loading,
      pictureTaken,
      error,
      commonName,
      showWarningModal,
      errorEvent,
      focusedScreen
    } = this.state;
    const { navigation } = this.props;

    let helpText;

    if ( rankToRender === "class" || rankToRender === "order" || rankToRender === "family" ) {
      helpText = i18n.t( "camera.scan_class" );
    } else if ( rankToRender === "genus" ) {
      helpText = i18n.t( "camera.scan_genus" );
    } else if ( rankToRender === "species" ) {
      helpText = i18n.t( "camera.scan_species" );
    } else {
      helpText = i18n.t( "camera.scan" );
    }

    return (
      <View style={styles.container}>
        <NavigationEvents
          onDidFocus={() => this.checkForCameraLaunch()}
          onWillBlur={() => {
            this.resetPredictions();
            this.setError( null );
            this.setFocusedScreen( false );
          }}
          onWillFocus={() => {
            this.requestAllCameraPermissions();
            this.handleResumePreview();
            this.setFocusedScreen( true );
          }}
        />
        <RNModal
          isVisible={showWarningModal}
          onBackdropPress={() => this.toggleWarningModal()}
          onSwipeComplete={() => this.toggleWarningModal()}
          swipeDirection="down"
        >
          <WarningModal toggleWarningModal={this.toggleWarningModal} />
        </RNModal>
        {loading ? (
          <View style={styles.loading}>
            <LoadingWheel color="white" />
          </View>
        ) : null}
        {error ? <CameraError error={error} errorEvent={errorEvent} /> : null}
        <TouchableOpacity
          accessibilityLabel={i18n.t( "accessibility.back" )}
          accessible
          hitSlop={styles.touchable}
          onPress={() => this.closeCamera() }
          style={styles.backButton}
        >
          <Image source={icons.closeWhite} />
        </TouchableOpacity>
        {!error ? (
          <React.Fragment>
            <ARCameraHeader
              commonName={commonName}
              ranks={ranks}
              rankToRender={rankToRender}
            />
            <Text style={styles.scanText}>{helpText}</Text>
            {!pictureTaken ? (
              <TouchableOpacity
                accessibilityLabel={i18n.t( "accessibility.take_photo" )}
                accessible
                onPress={() => {
                  this.setPictureTaken();
                  this.takePicture();
                }}
                style={styles.shutter}
              >
                {ranks && ranks.species
                  ? <Image source={icons.arCameraGreen} />
                  : <Image source={icons.arCameraButton} />}
              </TouchableOpacity>
            ) : (
              <View style={styles.shutter}>
                {ranks && ranks.species
                  ? <Image source={icons.arCameraGreen} />
                  : <Image source={icons.arCameraButton} />}
              </View>
            )}
            <TouchableOpacity
              accessibilityLabel={i18n.t( "accessibility.help" )}
              accessible
              onPress={() => navigation.navigate( "CameraHelp" )}
              style={styles.help}
            >
              <Image source={icons.cameraHelp} />
            </TouchableOpacity>
          </React.Fragment>
        ) : null}
        {focusedScreen ? ( // this is necessary for handleResumePreview to work properly in iOS
          <INatCamera
            ref={( ref ) => {
              this.camera = ref;
            }}
            confidenceThreshold={Platform.OS === "ios" ? 0.7 : "0.7"}
            modelPath={dirModel}
            onCameraError={this.handleCameraError}
            onCameraPermissionMissing={this.handleCameraPermissionMissing}
            onClassifierError={this.handleClassifierError}
            onDeviceNotSupported={this.handleDeviceNotSupported}
            onTaxaDetected={this.handleTaxaDetected}
            style={styles.camera}
            taxaDetectionInterval={Platform.OS === "ios" ? 1000 : "1000"}
            taxonomyPath={dirTaxonomy}
          />
        ) : null}
      </View>
    );
  }
}

export default ARCamera;
