import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SongComponent } from "./song/song.component";
import { MainScreenStatusService } from '../../services/main-screen-status.service';
import { HomeitemComponent } from "./homeitem/homeitem.component";

@Component({
  selector: 'app-mainscreen',
  standalone: true,
  imports: [CommonModule, ScrollingModule, SongComponent, HomeitemComponent],
  templateUrl: './mainscreen.component.html',
  styleUrl: '../../../styles.css'
})
export class MainScreenComponent {
  
  constructor (public mainScreenStatus:MainScreenStatusService) {}

  async ngOnInit() {
    this.mainScreenStatus.setHome();
  }

  trackBySong(_index: number, song: { id: string }): string {
    return song.id;
  }

}

