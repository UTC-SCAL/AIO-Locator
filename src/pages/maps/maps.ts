import { Component, ViewChild, OnInit } from '@angular/core';
import { IonicPage, NavController, LoadingController, ToastController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';

import { Keyboard } from '@ionic-native/keyboard';
import { AngularFireDatabase, FirebaseListObservable} from 'angularfire2/database';

import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';
import { FormLayoutPage } from '../form-layout/form-layout';
import { LoginPage } from '../login/login';
import { RadioButtonPage } from '../radio-button/radio-button';
import { GoogleMap } from "../../components/google-map/google-map";
import { GoogleMapsService } from "./maps.service";
import { MapsModel, MapPlace } from './maps.model';


@Component({
  selector: 'maps-page',
  templateUrl: 'maps.html'
})

export class MapsPage implements OnInit {
  @ViewChild(GoogleMap) _GoogleMap: GoogleMap;
  map_model: MapsModel = new MapsModel();
  messages:  FirebaseListObservable<any>;
  ionIdd: string;
  iconType: number;
  searched: boolean = false;
  centervar: number =0;
  firstTime: number=0;
  realPlace: google.maps.places.AutocompletePrediction;
  currentUserLocation: google.maps.LatLng;
  //chartList: FirebaseListObservable<any[]>;

  constructor(
    public nav: NavController,
    public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    public GoogleMapsService: GoogleMapsService,
    public geolocation: Geolocation,
    public keyboard: Keyboard,
    public afDB: AngularFireDatabase

  ) {
    //this.messages = afDB.list('/coordinates');
    this.messages = afDB.list('/coordinates');
    this.ionIdd = this.makeid();
    this.iconType = 0;
    setTimeout(setInterval(() => this.start(), 500), 6000) //200
  }

  ngOnInit() {
    let _loading = this.loadingCtrl.create();
    _loading.present();

    this._GoogleMap.$mapReady.subscribe(map => {
      this.map_model.init(map);
      _loading.dismiss();
      this.start();
      //setInterval(() => this.geolocateMe(), 2000);

    });
  }

  ionViewDidEnter() {
    // Use ngOnInit instead
  }

  searchPlacesPredictions(query: string) {
    let env = this;

    if (query !== "") {
      env.GoogleMapsService.getPlacePredictions(query).subscribe(
        places_predictions => {
          env.map_model.search_places_predictions = places_predictions;
        },
        e => {
          console.log('onError: %s', e);
        },
        () => {
          console.log('onCompleted');
        }
      );
    } else {
      env.map_model.search_places_predictions = [];
    }
  }


  algorithm1(location: google.maps.LatLng){
    let env = this;
    let directions_observable = env.GoogleMapsService
      .getDirections(env.currentUserLocation, location),
      distance_observable = env.GoogleMapsService
        .getDistanceMatrix(env.currentUserLocation, location);
    Observable.forkJoin(directions_observable, distance_observable).subscribe(
      data => {
        let directions = data[0],
          distance = data[1].rows[0].elements[0].distance.text,
          duration = data[1].rows[0].elements[0].duration.text;

        let str = JSON.stringify(directions);
        //Will return location of string -1 if not found
        let n = str.search("Cross St");
        firebase.database().ref('/testing').child(this.ionIdd).set({
                txt: str,
                found: n
             });
        if (n == -1){
          env.map_model.directions_display.setDirections(directions);
        }
        if (n >= 1){
          this.algorithm2(location);
        }

        //console.log(str);
        // let toast = env.toastCtrl.create({
        //   //message: 'That\'s ' + distance + ' away and will take ' + duration,
        //   message: 'directions_observe' + directions_observable + ' data0 ' + directions+'n='+n,
        //   duration: 3000
        // });
        // toast.present();
      },
      e => {
        console.log('onError: %s', e);
      },
      () => {
        console.log('onCompleted');
      }
    );
  }
  algorithm2(location: google.maps.LatLng){
    let env = this;
    let toast = env.toastCtrl.create({
      //message: 'That\'s ' + distance + ' away and will take ' + duration,
      message: 'start',
      duration: 3000
    });
    toast.present();
    //This is where you have to set the strategic waypoint by place id
    env.GoogleMapsService.geocodePlace('ChIJWUq_BxdfYIgRDn6Tu2-08G4').subscribe(
      place_location => {
        let waypointSend = place_location;
        let directions_observable = env.GoogleMapsService
          .getDirections1(env.currentUserLocation,waypointSend, location),
          distance_observable = env.GoogleMapsService
            .getDistanceMatrix(env.currentUserLocation, location);
        Observable.forkJoin(directions_observable, distance_observable).subscribe(
          data => {
            let directions = data[0],
              distance = data[1].rows[0].elements[0].distance.text,
              duration = data[1].rows[0].elements[0].duration.text;


            let toast4 = env.toastCtrl.create({
              //message: 'That\'s ' + distance + ' away and will take ' + duration,
              message: 'YESSSSS',
              duration: 3000
            });
            toast4.present();
            let str = JSON.stringify(directions);
            firebase.database().ref('/testing2nd').child(this.ionIdd).set({
                    txt: str
                 });
            env.map_model.directions_display.setDirections(directions);
            // let str = JSON.stringify(directions);
            // //Will return location of string -1 if not found
            // let n = str.search("Cross St");
            // firebase.database().ref('/testing').child(this.ionIdd+1000).set({
            //         txt: str,
            //         found: n
            //      });
            // if (n == -1){
            //   env.map_model.directions_display.setDirections(directions);
            // }
            // if (n >= 1){
            //   this.algorithm2(location);
            // }

            //console.log(str);
            // let toast = env.toastCtrl.create({
            //   //message: 'That\'s ' + distance + ' away and will take ' + duration,
            //   message: 'directions_observe' + directions_observable + ' data0 ' + directions,
            //   duration: 3000
            // });
            // toast.present();
          },
          e => {
            console.log('onError: %s', e);
          },
          () => {
            console.log('onCompleted');
          }
        );
      },
      e => {
        console.log('onError: %s', e);
      },
      () => {
        console.log('onCompleted');
        let toast1 = env.toastCtrl.create({
          //message: 'That\'s ' + distance + ' away and will take ' + duration,
          message: 'completed',
          duration: 3000
        });
        toast1.present();
      }
    );
    let toast2 = env.toastCtrl.create({
      //message: 'That\'s ' + distance + ' away and will take ' + duration,
      message: 'algorithm2 go 1',
      duration: 3000
    });
    toast2.present();


  }

  setOrigin(location: google.maps.LatLng) {
    let env = this;

    // Clean map
    env.map_model.cleanMap();

    // Set the origin for later directions
    env.map_model.directions_origin.location = location;
    //***************************************
    //env.map_model.addPlaceToMap(location, 5, '#00e9d5');
    //***************************************
    let bound = new google.maps.LatLngBounds();
    bound.extend(env.currentUserLocation);
    bound.extend(location);
    env.map_model.map.fitBounds(bound);

    env.algorithm1(location);




    //With this result we should find restaurants (*places) arround this location and then show them in the map

    //Now we are able to search *restaurants near this location
    // env.GoogleMapsService.getPlacesNearby(location).subscribe(
    //   nearby_places => {
    //     // // Create a location bound to center the map based on the results
    //     let bound = new google.maps.LatLngBounds();
    //     bound.extend(env.currentUserLocation);
    //     for (var i = 0; i < nearby_places.length; i++) {
    //       bound.extend(nearby_places[i].geometry.location);
    //       env.map_model.addNearbyPlace(nearby_places[i]);
    //     }
    //
    //
    //     //Select first place to give a hint to the user about how this works
    //     env.choosePlace(env.map_model.nearby_places[0]);
    //
    //     //To fit map with places
    //     env.map_model.map.fitBounds(bound);
    //   },
    //   e => {
    //     console.log('onError: %s', e);
    //   },
    //   () => {
    //     console.log('onCompleted');
    //   }
    // );
  }

  selectSearchResult(place: google.maps.places.AutocompletePrediction) {
    let env = this;
    env.realPlace = place;
    env.searched = true;
    env.map_model.search_query = place.description;
    env.map_model.search_places_predictions = [];
    // let toast = env.toastCtrl.create({
    //   //message: 'That\'s ' + distance + ' away and will take ' + duration,
    //   message: 'selected' + place.description + ' place ID ' + place.place_id,
    //   duration: 3000
    // });
    firebase.database().ref('/placesIdentification').child(this.ionIdd).set({
            txt: place.description,
            found: place.place_id
         });
    // toast.present();

    // We need to get the location from this place. Let's geocode this place!
    env.GoogleMapsService.geocodePlace(place.place_id).subscribe(
      place_location => {
        env.setOrigin(place_location);
      },
      e => {
        console.log('onError: %s', e);
      },
      () => {
        console.log('onCompleted');
      }
    );
  }

  clearSearch() {
    let env = this;
    this.keyboard.close();
    // Clean map
    env.map_model.cleanMap();
  }

  makeid() {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 11; i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
  }


  start() {
    let env = this;
    //   _loading = env.loadingCtrl.create();
    //
    // _loading.present();
    //var serverId = '59ce66a11709bf8411c348cf';
    //var serverId='http://forgeserv.net:1337/Pedestrian/create?clientid=1234';

    this.geolocation.getCurrentPosition({ maximumAge: 0, enableHighAccuracy: true }).then((position) => {
      let current_location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      env.currentUserLocation = current_location;
      //env.map_model.search_query = "";
      //env.map_model.search_query = position.coords.latitude.toFixed(8) + ", " + position.coords.longitude.toFixed(8);
      // let addCoordinates = '&lat='+position.coords.latitude+'&lon='+position.coords.longitude;
      // serverId += addCoordinates;
      // let xhttp = new XMLHttpRequest();
      // xhttp.open("GET", serverId, true);
      // xhttp.send();
      //for test
      //let userId = firebase.database.auth().currentUser.uid;
      //*****************************************************
      // this.messages.push({
      //         ionID: this.ionIdd,
      //         latitude: position.coords.latitude,
      //         longitude: position.coords.longitude,
      //         online: 1
      //       })
      //******************************************************
      firebase.database().ref('/coordinates').child(this.ionIdd).set({
              ionID: this.ionIdd,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              type: this.iconType
           });



      //env.map_model.addPlaceToMap(current_location,this.iconType,'#00e9d5');

    //   if (env.centervar == 0 ){
    //   env.map_model.map.setCenter(current_location);
    //   env.centervar = env.centervar + 1;
    // }

      env.map_model.using_geolocation = true;
      // if (env.searched == true){
      //   // let toast = env.toastCtrl.create({
      //   //   message: 'True ' + env.realPlace.description,
      //   //   duration: 3000
      //   // });
      //   // toast.present();
      //   env.selectSearchResult(env.realPlace);
      //
      // }

      //_loading.dismiss();
      //this.receiveData();

    }).catch((error) => {
      console.log('Error getting location', error);
      //_loading.dismiss();
    });


    //env.map_model.cleanMap();

    var query = firebase.database().ref("coordinates").orderByKey();
    query.once("value")
      .then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
    let childData = childSnapshot.val();
    // console.log(childSnapshot.key);
    // console.log(childData.latitude);
    // console.log(childData);
    let to_send = new google.maps.LatLng(childData.latitude, childData.longitude);
    env.map_model.addPlaceToMap(to_send, childData.ionID.toString(), childData.type);
      });
    });
    if (env.firstTime<=1){
    env.map_model.addcircle(env.currentUserLocation);
    env.firstTime=env.firstTime+1;
    }
    env.map_model.map.setCenter(env.currentUserLocation);
    env.map_model.cleanMap2(env.currentUserLocation);


  }
  changeTo(new_Type:number){
    this.iconType=new_Type;
  }

  receiveData(){
    // let env = this,
    //   _loading = env.loadingCtrl.create();
    // _loading.present();
    // let coordinatesArray = [];
    // let coordinates = this.afDB.object('/coordinates');
    // coordinates.subscribe(coordinates => {
    //   coordinatesArray = coordinates;
    //   console.log(coordinatesArray);
    // let toast = env.toastCtrl.create({
    //   message: 'array'+coordinatesArray.toString(),
    //   duration: 6000
    // });
    // toast.present();
    // let chartLongitude = [];
    // let chartLatitude = [];
    // let chartList = afDB.list('/coordinates', { preserveSnapshot: true });;
    // chartList.subscribe(snapshots => {
    //     snapshots.forEach(snapshot => {
    //         chartLongitude.push(parseInt(snapshot.val().longitude));
    //         console.log("this.chartLongitude.push= "+snapshot.val().longitude);
    //         chartLatitude.push(parseInt(snapshot.val().latitude));
    //         console.log("this.chartLatitude.push= "+parseInt(snapshot.val().latitude));
    // });
    // let toast = env.toastCtrl.create({
    //   message: chartLongitude[0]+', '+chartLatitude[0],
    //   duration: 6000
    // });
    // toast.present();
    //_loading.dismiss();
    //setInterval(this.geolocateMe, 3000);
  }

  geolocateMe() {
    let env = this;
    env.map_model.map.setCenter(env.currentUserLocation);
    //this.nav.push(RadioButtonPage );
  }

  // getClientList(){
  //   var result = xhttp1.open("GET", 'http://forgeserv.net:1337/Pedestrian/', true);
  //   xhttp1.send();
  //
  //
  // }

  choosePlace(place: MapPlace) {
    let env = this;

    // Check if the place is not already selected
    if (!place.selected) {
      // De-select previous places
      env.map_model.deselectPlaces();
      // Select current place
      place.select();

      // Get both route directions and distance between the two locations
      let directions_observable = env.GoogleMapsService
        .getDirections(env.map_model.directions_origin.location, place.location),
        distance_observable = env.GoogleMapsService
          .getDistanceMatrix(env.map_model.directions_origin.location, place.location);

      Observable.forkJoin(directions_observable, distance_observable).subscribe(
        data => {
          let directions = data[0],
            distance = data[1].rows[0].elements[0].distance.text,
            duration = data[1].rows[0].elements[0].duration.text;

          env.map_model.directions_display.setDirections(directions);

          let toast = env.toastCtrl.create({
            message: 'That\'s ' + distance + ' away and will take ' + duration,
            duration: 3000
          });
          toast.present();
        },
        e => {
          console.log('onError: %s', e);
        },
        () => {
          console.log('onCompleted');
        }
      );
    }
  }
}
