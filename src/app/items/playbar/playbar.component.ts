import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SongManagementService } from '../../services/song-management.service';


@Component({
  selector: 'app-playbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playbar.component.html',
  styleUrl: '../../../styles.css'
})
export class PlaybarComponent {

  constructor(public songManagement:SongManagementService) {}

  volume:number = 50

  loopMode:string = "none"
  shuffle:boolean = false

  @ViewChild('titleStatic') titleStatic!: ElementRef;
  overflows = false;
  private lastTitle = '';

  ngDoCheck() {
    const currentTitle = this.songManagement.songTitle;
    if (currentTitle !== this.lastTitle) {
      this.lastTitle = currentTitle;
      this.overflows = false;
    }
  }

  ngAfterViewChecked() {
    const el = this.titleStatic?.nativeElement;
    if (el) {
      const newVal = el.scrollWidth > el.clientWidth;
      if (newVal !== this.overflows) {
        this.overflows = newVal;
      }
    }
  }

  async togglePlayPause() {
    this.songManagement.togglePlayPause();
  }

  async onInput(event: Event) {
    this.songManagement.onInput(event);
  }

  onVolume(event: Event) {
    this.volume = this.songManagement.onVolume(event);
  }

  formatTime(seconds: number | undefined): string {
    return this.songManagement.formatTime(seconds);
  }

  cycleLoop() {
    this.loopMode = this.songManagement.cycleLoop();
  }

  toggleShuffle() {
    this.shuffle = this.songManagement.toggleShuffle();
  }

  playNext() {
    this.songManagement.playNext();
  }

  playPrevious() {
    this.songManagement.playPrevious();
  }

}