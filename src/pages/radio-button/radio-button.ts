import { IonicPage, NavController, NavParams, ToastController  } from 'ionic-angular';
import { Component } from '@angular/core';
import { FormGroup,FormControl } from '@angular/forms';
import { MapsPage } from '../../pages/maps/maps';


//import { MapsPage } from './maps/maps';

/*
  Generated class for the Search page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@IonicPage()
@Component({
  selector: 'page-radio-button',
  templateUrl: 'radio-button.html'
})
export class RadioButtonPage {
    type: string;
    langForm: FormGroup;
    //environment: MapsPage;
    //type: number = 1;
    constructor(public navCtrl: NavController,public toastCtrl: ToastController ) {
      this.type = "Pedestrian";
      this.langForm = new FormGroup({
    langs: new FormControl({value: 'pedestrian', disabled: false})
    });
    }
    radioChecked(){

      let toast = this.toastCtrl.create({
      message: 'That\'s ' + this.type,
      duration: 3000
      });
      toast.present();
      //this.environment.iconType=this.type.ngvalue;
    }
    doSubmit(event: any) {
   console.log('Submitting form', this.langForm.value);
   event.preventDefault();
   let toast = this.toastCtrl.create({
   message: 'That\'s ' + event,
   duration: 3000
   });
   toast.present();


 }


}
