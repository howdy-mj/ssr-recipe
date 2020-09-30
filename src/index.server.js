import React from 'react';
import ReactDOMServer from 'react-dom/server';
import express from 'express';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import path from 'path';
import fs from 'fs';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import rootReducer from './modules';
import PreloadContext from './lib/PreloadContext';

// html에 js, css 파일을 불러오도록 코드 넣기
const manifest = JSON.parse(
  fs.readFileSync(path.resolve('./build/asset-manifest.json'), 'utf8'),
);

const chunks = Object.keys(manifest.files)
  .filter((key) => /chunk\.js$/.exec(key)) // chunk.js로 끝나는 키
  .map((key) => `<script src="${manifest.files[key]}"></script>`) // script 태그로 변환
  .join(''); // 합침

function createPage(root, stateScript) {
  // 서버에서 만든 상태를 브라우저에서 재사용하기 위해
  // 현재 스토어 상태를 문자열로 반환한 뒤 스크립트로 주입
  return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,shrink-to-fit=no"
        />
        <meta name="theme-color" content="#000000" />
        <title>React App</title>
        <link href="${manifest.files['main.css']}" rel="stylesheet" />
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root">
          ${root}
        </div>
        ${stateScript}
        <script src="${manifest.files['runtime-main.js']}"></script>
        ${chunks}
        <script src="${manifest.files['main.js']}"></script>
      </body>
      </html>
        `;
}

const app = express();

// SSR 처리할 핸들러 함수
const serverRender = async (req, res, next) => {
  // 404가 떠야하는 상황에, 404대신 SSR

  const context = {};
  const store = createStore(rootReducer, applyMiddleware(thunk));
  const preloadContext = {
    // 클라이언트와 달리 서버는 요청이 들어올때마다 새로운 스토어가 만들어 짐
    done: false,
    promises: [],
  };

  const jsx = (
    <PreloadContext.Provider value={preloadContext}>
      <Provider store={store}>
        <StaticRouter location={req.url} context={context}>
          <App />
        </StaticRouter>
      </Provider>
    </PreloadContext.Provider>
  );

  ReactDOMServer.renderToStaticMarkup(jsx); // 한 번 렌더링
  // renderToString 보다 함수 호출이 빠름
  try {
    await Promise.all(preloadContext.promises); // 모든 프로미스 기다림
  } catch (e) {
    return res.status(500);
  }
  preloadContext.done = true;
  const root = ReactDOMServer.renderToString(jsx); // render

  const stateString = JSON.stringify(store.getState()).replace(/</g, '\\u003c');
  // JSON을 문자열로 변환하고 악성 스크립트가 실행되는 것을 방지하기 위해 <를 치환 처리
  const stateScript = `<script>__PRELOADED_STATE__ = ${stateString}</script>`;
  // redux 초기상태를 스크립트로 주입

  res.send(createPage(root, stateScript)); // client에게 결과물 응답
};

const serve = express.static(path.resolve('./build'), {
  index: false, // "/"경로에서 index.html을 안보이게 설정
});

app.use(serve); // serverRender 전에 위치해야 함
app.use(serverRender);

app.listen(5000, () => {
  console.log('Running on http://localhost:5000');
});
