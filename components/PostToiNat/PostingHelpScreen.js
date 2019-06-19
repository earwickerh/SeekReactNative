// @flow

import React, { Component } from "react";
import {
  ScrollView,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  Platform
} from "react-native";
import { NavigationEvents } from "react-navigation";

import styles from "../../styles/posting/postingHelp";
import i18n from "../../i18n";
import GreenHeader from "../GreenHeader";
import icons from "../../assets/posting";
import Padding from "../Padding";

type Props = {
  navigation: any
}


class PostingHelpScreen extends Component<Props> {
  scrollToTop() {
    if ( this.scrollView ) {
      this.scrollView.scrollTo( {
        x: 0, y: 0, animated: Platform.OS === "android"
      } );
    }
  }

  render() {
    const { navigation } = this.props;

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeViewTop} />
        <SafeAreaView style={styles.safeView}>
          <StatusBar barStyle="light-content" />
          <NavigationEvents
            onWillFocus={() => this.scrollToTop()}
          />
          <GreenHeader
            navigation={navigation}
            header={i18n.t( "posting_help.header" )}
          />
          <ScrollView ref={( ref ) => { this.scrollView = ref; }}>
            <View style={styles.textContainer}>
              <View style={styles.row}>
                <Image source={icons.searchGreen} style={styles.icon} />
                <Text style={styles.headerText}>{i18n.t( "posting_help.identification" ).toLocaleUpperCase()}</Text>
              </View>
              <Text style={styles.text}>{i18n.t( "posting_help.id_description" )}</Text>
              <View style={styles.row}>
                <Image source={icons.date} style={styles.icon} />
                <View style={{ marginRight: 10 }} />
                <Image source={icons.location} style={styles.icon} />
                <Text style={styles.headerText}>{i18n.t( "posting_help.date" ).toLocaleUpperCase()}</Text>
              </View>
              <Text style={styles.text}>{i18n.t( "posting_help.date_description" )}</Text>
              <View style={styles.row}>
                <Image source={icons.geoprivacy} style={styles.icon} />
                <Text style={styles.headerText}>{i18n.t( "posting_help.geoprivacy" ).toLocaleUpperCase()}</Text>
              </View>
              <View style={{ marginTop: 16 }} />
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>{i18n.t( "posting_help.open_header" )}</Text>
                <Text style={styles.text}>{i18n.t( "posting_help.open" )}</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>{i18n.t( "posting_help.obscured_header" )}</Text>
                <Text style={styles.text}>{i18n.t( "posting_help.obscured" )}</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>{i18n.t( "posting_help.closed_header" )}</Text>
                <Text style={styles.text}>{i18n.t( "posting_help.closed" )}</Text>
              </Text>
              <View style={{ marginTop: 19 }} />
              <View style={styles.row}>
                <Image source={icons.captive} style={styles.icon} />
                <Text style={styles.headerText}>{i18n.t( "posting_help.captive" ).toLocaleUpperCase()}</Text>
              </View>
              <View style={{ marginTop: 16 }} />
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>{i18n.t( "posting_help.no_header" )}</Text>
                <Text style={styles.text}>{i18n.t( "posting_help.no" )}</Text>
              </Text>
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>{i18n.t( "posting_help.yes_header" )}</Text>
                <Text style={styles.text}>{i18n.t( "posting_help.yes" )}</Text>
              </Text>
              <View style={{ marginTop: 19 }} />
              <Text style={styles.italicText}>{i18n.t( "posting_help.addendum" )}</Text>
            </View>
            <Padding />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }
}

export default PostingHelpScreen;