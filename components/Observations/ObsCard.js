// @flow

import React, { useRef, useEffect } from "react";
import { Image, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";

import { setSpeciesId, setRoute } from "../../utility/helpers";
import styles from "../../styles/observations/obsCard";
import icons from "../../assets/icons";
import SpeciesCard from "../UIComponents/SpeciesCard";
import { useUserPhoto } from "../../utility/customHooks";

type Props = {
  +item: Object,
  +openModal: Function,
  +updateItemScrolledId: Function,
  +itemScrolledId: ?number
}

const ObservationCard = ( {
  item,
  openModal,
  updateItemScrolledId,
  itemScrolledId
}: Props ) => {
  const isFocused = useIsFocused();
  const scrollView = useRef( null );
  const { navigate } = useNavigation();

  const { taxon } = item;
  const { id } = taxon;

  const photo = useUserPhoto( item, isFocused );

  useEffect( () => {
    const scrollLeft = () => {
      if ( scrollView.current ) {
        scrollView.current.scrollTo( {
          x: 0, y: 0, duration: 300
        } );
      }
    };

    if ( itemScrolledId && itemScrolledId !== id ) {
      updateItemScrolledId( null );
      scrollLeft();
    }
  }, [updateItemScrolledId, id, itemScrolledId] );

  return (
    <ScrollView
      ref={scrollView}
      contentContainerStyle={styles.card}
      horizontal
      onScrollBeginDrag={() => updateItemScrolledId( id )}
      showsHorizontalScrollIndicator={false}
    >
      <SpeciesCard
        taxon={taxon}
        handlePress={() => {
          setSpeciesId( id );
          setRoute( "Observations" );
          navigate( "Species" );
        }}
        photo={photo}
      />
      <TouchableOpacity
        onPress={() => openModal( photo, taxon )}
        style={styles.deleteButton}
      >
        <Image source={icons.delete} />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ObservationCard;
