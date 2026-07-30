import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SongAddingService } from '../../../services/song-adding.service';
import { PlaylistComponent } from "../playlist-button/playlist/playlist.component";
import { appDataDir } from '@tauri-apps/api/path';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { MainScreenStatusService } from '../../../services/main-screen-status.service';
import { SongManagementService } from '../../../services/song-management.service';

@Component({
  selector: 'app-homeitem',
  standalone: true,
  imports: [CommonModule, PlaylistComponent],
  templateUrl: './homeitem.component.html',
  styleUrl: '../../../../styles.css'
})
export class HomeitemComponent {
  isModalOpen: boolean = false;

  isDropDownOpen: boolean = false;

  constructor (public songManagement:SongManagementService, public songAdding:SongAddingService, public mainScreenStatus:MainScreenStatusService) {}

  @Input() id!: string;
  @Input() path!: string;
  @Input() title!: string;
  @Input() artist!: string;
  @Input() album!: string;
  @Input() year!: string;
  @Input() duration!: string;
  @Input() isStarred!: boolean;

  @Input() playlistId!: number;

  _coverPath!: string;
  @Input() set coverPath(value: string) {
    this._coverPath = value;
    this.coverUrl = value ? convertFileSrc(value) : 'assets/black.jpg';
  }
  get coverPath(): string { return this._coverPath; }

  coverUrl: string = 'assets/black.jpg';
  //this.path,this.title,this.artist,this.coverUrl
  playSong() {
    let song:Song = {id: this.id, path: this.path, title:this.title, artist: this.artist, album: this.album, year: this.year, duration: this.duration, coverPath: this.coverPath, isStarred: this.isStarred };
    this.songManagement.setOneSong(song);
  }

  addSongToQueue() {
    let song:Song = {id: this.id, path: this.path, title:this.title, artist: this.artist, album: this.album, year: this.year, duration: this.duration, coverPath: this.coverPath, isStarred: this.isStarred };
    this.songManagement.addOneSong(song);
  }

  addSongToPlaylist() {
    this.songAdding.getAllPlaylists();
    this.isModalOpen = true;
  }

  async removeSongFromPlaylist() {
    const data_dir = await appDataDir();
    invoke('remove_song_from_playlist', {playlist_id: this.playlistId, song_id: this.id, db_path: data_dir});
    console.log("Canción Eliminada: " + this.id + " en: " + this.playlistId);
    this.mainScreenStatus.refresh();
  }

  close() {
    this.isModalOpen = false;
    this.songAdding.letGo();
  }

  toggleDropDown() {
    this.isDropDownOpen = !this.isDropDownOpen;
  }

  closeDropDown() {
    this.isDropDownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative.inline-block')) {
      this.closeDropDown();
    }
  }

  async toggleStarred() {
    const data_dir = await appDataDir();
    
    if (this.isStarred) {
      invoke('remove_is_starred', {song_id: this.id, db_path: data_dir});
      console.log("Canción !Starred: " + this.id);
    } else {
      invoke('add_is_starred', {song_id: this.id, db_path: data_dir});
      console.log("Canción Starred: " + this.id);
    }

    this.mainScreenStatus.refresh();
  }

}

interface Song {
  id:string,
  path:string,
  title:string,
  artist:string,
  album:string,
  year:string,
  duration:string,
  coverPath:string,
  isStarred:boolean
}

