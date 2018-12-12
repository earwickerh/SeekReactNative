// @flow

import React, { Component } from "react";
import {
  View,
  ImageBackground,
  Platform
} from "react-native";
import inatjs from "inaturalistjs";
import jwt from "react-native-jwt-io";
import ImageResizer from "react-native-image-resizer";
import Realm from "realm";
import moment from "moment";

import realmConfig from "../../models/index";
import ChallengeResultsScreen from "./ChallengeResultsScreen";
import LoadingWheel from "../LoadingWheel";
import ErrorScreen from "../ErrorScreen";
import config from "../../config";
import styles from "../../styles/results";
import { addToCollection, flattenUploadParameters } from "../../utility/helpers";

type Props = {
  navigation: any
}

class ChallengeResults extends Component {
  constructor( { navigation }: Props ) {
    super();

    const {
      id,
      image,
      time,
      latitude,
      longitude,
      commonName,
      targetTaxaPhoto
    } = navigation.state.params;

    this.state = {
      title: null,
      subtitle: null,
      loading: true,
      match: null,
      matchUrl: null,
      text: null,
      buttonText: null,
      taxaId: null,
      taxaName: null,
      observation: {},
      seenTaxaIds: [],
      id,
      image,
      time,
      latitude,
      longitude,
      error: null,
      commonName,
      targetTaxaPhoto
    };

    this.savePhotoOrStartOver = this.savePhotoOrStartOver.bind( this );
  }

  componentDidMount() {
    this.resizeImage();
    this.fetchTargetTaxonPhoto();
  }

  setTextAndPhoto( seenDate ) {
    const {
      id,
      taxaId,
      score,
      taxaName,
      seenTaxaIds,
      commonName,
      targetTaxaPhoto
    } = this.state;

    if ( seenTaxaIds.length >= 1 && seenDate !== null ) {
      this.setState( {
        title: "Deja Vu!",
        subtitle: `Looks like you already collected a ${taxaName}`,
        match: true,
        text: `You collected a photo of a ${taxaName} on ${seenDate}`,
        buttonText: "OK",
        yourPhotoText: `Your Photo:\n${taxaName}`,
        photoText: `Identified Species:\n${taxaName}`
      } );
    } else if ( score > 85 && id === null ) {
      this.setState( {
        title: "Sweet!",
        subtitle: `You saw a ${taxaName}`,
        match: true,
        text: null,
        buttonText: "Add to Collection",
        yourPhotoText: `Your Photo:\n${taxaName}`,
        photoText: `Identified Species:\n${taxaName}`
      } );
    } else if ( score <= 85 && id === null ) {
      this.setState( {
        title: "Hrmmmmm",
        subtitle: "We can't figure this one out. Please try some adjustments.",
        match: "unknown",
        text: "Here are some photo tips:\nGet as close as possible while being safe\nCrop out unimportant parts\nMake sure things are in focus",
        buttonText: "Start over"
      } );
    } else if ( score > 85 && id === taxaId ) {
      this.setState( {
        title: "It's a Match!",
        subtitle: `You saw a ${taxaName}`,
        match: true,
        text: null,
        buttonText: "Add to Collection"
      } );
    } else if ( score > 85 && id !== taxaId ) {
      this.setState( {
        title: "Good Try!",
        subtitle: `However, this isn't a ${commonName}, it's a ${taxaName}.`,
        match: false,
        text: `You still need to collect a ${taxaName}. Would you like to collect it now?`,
        buttonText: "Add to Collection",
        yourPhotoText: "Your Photo\n",
        photoText: `Target Species:\n${commonName}`,
        matchUrl: targetTaxaPhoto
      } );
    } else {
      this.setState( {
        title: "Hrmmmmm",
        subtitle: "We can't figure this one out. Please try some adjustments.",
        match: "unknown",
        text: "Here are some photo tips:\nGet as close as possible while being safe\nCrop out unimportant parts\nMake sure things are in focus",
        buttonText: "Start over"
      } );
    }
  }

  fetchTargetTaxonPhoto() {
    const { id } = this.state;

    inatjs.taxa.fetch( id ).then( ( response ) => {
      const taxa = response.results[0];
      this.setState( {
        targetTaxaPhoto: taxa.default_photo.medium_url
      } );
    } ).catch( ( err ) => {
      console.log( err, "error fetching taxon photo" );
    } );
  }

  fetchSeenTaxaIds( taxaId ) {
    Realm.open( realmConfig )
      .then( ( realm ) => {
        const seenTaxaIds = realm.objects( "TaxonRealm" ).map( t => t.id );
        if ( seenTaxaIds.includes( taxaId ) ) {
          const observations = realm.objects( "ObservationRealm" );
          const seenTaxa = observations.filtered( `taxon.id == ${taxaId}` );
          const seenDate = moment( seenTaxa[0].date ).format( "ll" );
          this.setState( {
            seenTaxaIds
          }, () => this.setTextAndPhoto( seenDate ) );
        }
      } ).catch( ( err ) => {
        console.log( "[DEBUG] Failed to open realm, error: ", err );
        this.setTextAndPhoto();
      } );
    this.setTextAndPhoto();
  }

  savePhotoOrStartOver() {
    const {
      id,
      observation,
      taxaName,
      latitude,
      longitude,
      image,
      buttonText
    } = this.state;

    const {
      navigation
    } = this.props;

    if ( buttonText === "OK" ) {
      navigation.push( "Main", { taxaName: null } );
    } else if ( buttonText === "Add to Collection" ) {
      console.log( "clicked on:", latitude, longitude, image );
      addToCollection( observation, latitude, longitude, image );
      navigation.push( "Main", { taxaName } );
    } else if ( buttonText === "Start over" ) {
      navigation.push( "Camera", {
        id,
        latitude,
        longitude,
        commonName: null
      } );
    } else {
      navigation.push( "Main", { taxaName: null } );
    }
  }

  resizeImage() {
    const {
      image,
      time,
      latitude,
      longitude
    } = this.state;

    ImageResizer.createResizedImage( image.uri, 299, 299, "JPEG", 100 )
      .then( ( { uri } ) => {
        let resizedImageUri;

        if ( Platform.OS === "ios" ) {
          const uriParts = uri.split( "://" );
          resizedImageUri = uriParts[uriParts.length - 1];
        } else {
          resizedImageUri = uri;
        }
        const params = flattenUploadParameters( resizedImageUri, time, latitude, longitude );
        this.fetchScore( params );
      } ).catch( ( err ) => {
        this.setState( {
          error: `${err.message}: couldn't resize image`
        } );
      } );
  }

  createJwtToken() {
    const claims = {
      application: "SeekRN",
      exp: new Date().getTime() / 1000 + 300
    };

    const token = jwt.encode( claims, config.jwtSecret, "HS512" );
    return token;
  }

  fetchScore( params ) {
    const token = this.createJwtToken();

    inatjs.computervision.score_image( params, { api_token: token } )
      .then( ( { results } ) => {
        const match = results[0];
        this.setState( {
          observation: match,
          taxaId: match.taxon.id,
          taxaName: match.taxon.preferred_common_name || match.taxon.name,
          score: match.combined_score,
          matchUrl: match.taxon.default_photo.medium_url,
          loading: false
        }, () => {
          this.fetchSeenTaxaIds( this.state.taxaId );
        } );
      } )
      .catch( () => {
        this.setState( {
          error: "Can't load computer vision suggestions. Try again later."
        } );
      } );
  }

  render() {
    const {
      error,
      loading,
      title,
      subtitle,
      match,
      matchUrl,
      text,
      buttonText,
      photoText,
      yourPhotoText,
      image
    } = this.state;

    const {
      navigation
    } = this.props;

    let content;

    if ( error ) {
      content = <ErrorScreen error={error} />;
    } else if ( loading ) {
      content = <LoadingWheel />;
    } else {
      content = (
        <ChallengeResultsScreen
          title={title}
          subtitle={subtitle}
          match={match}
          matchUrl={matchUrl}
          text={text}
          buttonText={buttonText}
          photoText={photoText}
          yourPhotoText={yourPhotoText}
          image={image}
          navigation={navigation}
          savePhotoOrStartOver={this.savePhotoOrStartOver}
        />
      );
    }

    return (
      <View style={styles.mainContainer}>
        <ImageBackground
          style={styles.backgroundImage}
          source={require( "../../assets/backgrounds/background.png" )}
        >
          {content}
        </ImageBackground>
      </View>
    );
  }
}

export default ChallengeResults;
