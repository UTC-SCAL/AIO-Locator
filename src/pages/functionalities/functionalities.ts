import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { MapsPage } from '../maps/maps';
import { GoogleLoginPage } from '../google-login/google-login';
import { ContactCardPage } from '../contact-card/contact-card';

@Component({
  selector: 'functionalities-page',
  templateUrl: 'functionalities.html'
})
export class FunctionalitiesPage {
  items: Array<{title: string, note?: string, component: any}>;

  constructor(public nav: NavController) {
    this.items = [
      { title: 'Google Integration', component: GoogleLoginPage },
      { title: 'Contact Card', component: ContactCardPage },
      { title: 'Maps', component: MapsPage }
    ];
  }

  itemTapped(event, item) {
    this.nav.push(item.component);
  }

}
