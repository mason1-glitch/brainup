import { mount } from 'svelte';
import './design/tokens.css';
import './design/base.css';
import App from './app/App.svelte';

mount(App, { target: document.getElementById('app')! });
