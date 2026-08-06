import { render } from 'preact';
import { App } from './editor/App.tsx';
import './styles/global.css';

render(<App />, document.getElementById('app')!);
