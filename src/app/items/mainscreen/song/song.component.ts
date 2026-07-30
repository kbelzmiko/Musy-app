import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SongAddingService } from '../../../services/song-adding.service';
import { appDataDir } from '@tauri-apps/api/path';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { MainScreenStatusService } from '../../../services/main-screen-status.service';
import { SongManagementService } from '../../../services/song-management.service';
import { readFile } from '@tauri-apps/plugin-fs';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song.component.html',
  styleUrl: '../../../../styles.css'
})
export class SongComponent implements OnInit, OnDestroy {
  private contextMenuEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;

  private _contextMenuHandler = () => { this.removeContextMenu(); };

  constructor (public songManagement:SongManagementService, public songAdding:SongAddingService, public mainScreenStatus:MainScreenStatusService) {}

  ngOnInit() {
    document.addEventListener('contextmenu', this._contextMenuHandler, {capture: true});
  }

  ngOnDestroy() {
    document.removeEventListener('contextmenu', this._contextMenuHandler, {capture: true});
    this.removeContextMenu();
    this.removeModal();
  }

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
  playSong() {
    let song:Song = {id: this.id, path: this.path, title:this.title, artist: this.artist, album: this.album, year: this.year, duration: this.duration, coverPath: this.coverPath, isStarred: this.isStarred };
    this.songManagement.setOneSong(song);
  }

  addSongToQueue() {
    let song:Song = {id: this.id, path: this.path, title:this.title, artist: this.artist, album: this.album, year: this.year, duration: this.duration, coverPath: this.coverPath, isStarred: this.isStarred };
    this.songManagement.addOneSong(song);
  }

  async addSongToPlaylist() {
    this.removeContextMenu();
    await this.songAdding.getAllPlaylists();
    this.showModal();
    document.body.style.overflow = 'hidden';
  }

  async removeSongFromPlaylist() {
    const data_dir = await appDataDir();
    invoke('remove_song_from_playlist', {playlist_id: this.playlistId, song_id: this.id, db_path: data_dir});
    console.log("Canción Eliminada: " + this.id + " en: " + this.playlistId);
    this.mainScreenStatus.refresh();
  }

  private removeContextMenu() {
    if (this.contextMenuEl) {
      this.contextMenuEl.remove();
      this.contextMenuEl = null;
    }
  }

  private removeModal() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  private async showModal() {
    this.removeModal();

    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;z-index:60;inset:0;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.6)';
    backdrop.addEventListener('click', () => this.closeModal());

    const card = document.createElement('div');
    card.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:#171717;padding:8px;border:2px solid #262626;border-radius:16px;height:320px';
    card.addEventListener('click', (e) => e.stopPropagation());

    const title = document.createElement('h1');
    title.style.cssText = 'font-size:24px;line-height:32px;margin:0;color:#fff';
    title.textContent = 'Add to Playlist';
    card.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:rgba(82,82,82,0.2);padding:8px;border:2px solid #262626;border-radius:16px;overflow-y:auto;flex:1;min-height:0';

    for (const playlist of this.songAdding.playlists) {
      if (playlist.id == 0) continue;

      const item = document.createElement('button');
      item.style.cssText = 'display:flex;gap:12px;align-items:center;background:transparent;color:#fff;padding:8px;border:none;border-radius:16px;width:100%;cursor:pointer;text-align:left';

      const img = document.createElement('img');
      img.style.cssText = 'width:56px;height:56px;border-radius:12px;object-fit:cover';
      img.src = 'assets/black.jpg';
      if (playlist.cover_path) {
        readFile(playlist.cover_path).then(data => {
          const blob = new Blob([data], { type: 'image/jpeg' });
          img.src = URL.createObjectURL(blob);
        }).catch(() => {});
      }

      const nameEl = document.createElement('h1');
      nameEl.style.cssText = 'font-size:20px;line-height:28px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:128px';
      nameEl.textContent = playlist.name;

      item.appendChild(img);
      const textDiv = document.createElement('div');
      textDiv.style.cssText = 'display:grid;grid-template-columns:1fr;text-align:left';
      textDiv.appendChild(nameEl);
      item.appendChild(textDiv);

      item.addEventListener('mouseenter', () => { item.style.background = 'rgba(201,2,88,0.25)'; item.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.5)'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; item.style.boxShadow = 'none'; });
      item.addEventListener('click', async () => {
        const data_dir = await appDataDir();
        invoke('add_song_to_playlist', {playlist_id: playlist.id, song_id: this.id, db_path: data_dir});
        console.log("Canción añadida: " + this.id + " en: " + playlist.name);
        this.mainScreenStatus.refresh();
        this.closeModal();
      });

      list.appendChild(item);
    }
    card.appendChild(list);

    const closeBtnDiv = document.createElement('div');
    closeBtnDiv.style.cssText = 'display:flex;gap:16px;margin-top:auto';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:rgba(82,82,82,0.2);color:#fff;padding:8px;border:2px solid #262626;border-radius:16px;width:100%;cursor:pointer';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(201,2,88,0.25)'; closeBtn.style.borderColor = 'rgba(201,2,88,0.25)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(82,82,82,0.2)'; closeBtn.style.borderColor = '#262626'; });
    closeBtn.addEventListener('click', () => this.closeModal());
    closeBtnDiv.appendChild(closeBtn);
    card.appendChild(closeBtnDiv);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    this.modalEl = backdrop;
  }

  closeModal() {
    this.removeModal();
    this.songAdding.letGo();
    document.body.style.overflow = '';
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.removeContextMenu();

    const menu = document.createElement('div');
    menu.style.cssText = 'position:fixed;z-index:9999;left:' + event.clientX + 'px;top:' + event.clientY + 'px;display:flex;flex-direction:column;gap:8px;background:#262626;padding:8px;border:1px solid #404040;border-radius:16px;width:176px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)';
    menu.addEventListener('click', (e) => e.stopPropagation());

    const makeBtn = (html: string, fn: () => void) => {
      const btn = document.createElement('button');
      btn.style.cssText = 'display:flex;gap:8px;align-items:center;background:rgba(82,82,82,0.2);color:#fff;padding:8px;border:2px solid #404040;border-radius:12px;width:100%;height:40px;cursor:pointer;transition:all 0.2s';
      btn.innerHTML = html;
      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(201,2,88,0.25)'; btn.style.borderColor = 'rgba(201,2,88,0.25)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(82,82,82,0.2)'; btn.style.borderColor = '#404040'; });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
        this.removeContextMenu();
      });
      return btn;
    };

    const starSvgHtml = this.isStarred
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width:24px;height:24px;fill:#d4d4d4;margin-left:2px"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width:24px;height:24px;fill:#d4d4d4;margin-left:2px"><path d="M287.9 0c9.2 0 17.6 5.2 21.6 13.5l68.6 141.3 153.2 22.6c9 1.3 16.5 7.6 19.3 16.3s.5 18.1-5.9 24.5L433.6 328.4l26.2 155.6c1.5 9-2.2 18.1-9.7 23.5s-17.3 6-25.3 1.7l-137-73.2L151 509.1c-8.1 4.3-17.9 3.7-25.3-1.7s-11.2-14.5-9.7-23.5l26.2-155.6L31.1 218.2c-6.5-6.4-8.7-15.9-5.9-24.5s10.3-14.9 19.3-16.3l153.2-22.6L266.3 13.5C270.4 5.2 278.7 0 287.9 0zm0 79L235.4 187.2c-3.5 7.1-10.2 12.1-18.1 13.3L99 217.9 184.9 303c5.5 5.5 8.1 13.3 6.8 21L171.4 443.7l105.2-56.2c7.1-3.8 15.6-3.8 22.6 0l105.2 56.2L384.2 324.1c-1.3-7.7 1.2-15.5 6.8-21l85.9-85.1L358.6 200.5c-7.8-1.2-14.6-6.1-18.1-13.3L287.9 79z"/></svg>';

    menu.appendChild(makeBtn(starSvgHtml + '<p style="margin:0">Starred</p>', () => this.toggleStarred()));

    const plusSvgHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width:24px;height:24px;fill:#d4d4d4;margin-left:2px"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/></svg>';

    menu.appendChild(makeBtn(plusSvgHtml + '<p style="margin:0">To Queue</p>', () => this.addSongToQueue()));
    menu.appendChild(makeBtn(plusSvgHtml + '<p style="margin:0">Add Song</p>', () => this.addSongToPlaylist()));

    if (this.playlistId != 0) {
      const trashSvgHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width:20px;height:20px;fill:#d4d4d4;margin:2px 0 0 4px"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-320zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z"/></svg>';
      menu.appendChild(makeBtn(trashSvgHtml + '<p style="margin:0">Remove song</p>', () => this.removeSongFromPlaylist()));
    }

    document.body.appendChild(menu);
    this.contextMenuEl = menu;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.removeContextMenu();
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
