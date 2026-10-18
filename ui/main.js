import { invoke, isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { mount } from './app.js';
if (isTauri()) {
  mount(document, {
    choose: () => open({directory:true,multiple:false,title:'Choose your image folder'}),
    run: (command,args) => invoke('inbox', {request:{command,...args}}),
  });
} else {
  document.querySelector('#status').textContent = 'Browser preview only. Run npm run tauri dev for native folder selection and indexing. The CLI works without Tauri.';
  document.querySelector('#choose').disabled = true;
}
