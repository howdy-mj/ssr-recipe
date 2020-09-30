import { createContext, useContext } from 'react';

// 클라이언트 환경: null
// 서버 환경: { done: false, promises: []}
const PreloadContext = createContext(null);
export default PreloadContext;

// resolve는 함수 타입
export const Preloader = ({ resolve }) => {
  const preloadContext = useContext(PreloadContext);
  if (!preloadContext) return null; // context 값이 유효하지 않다면 아무것도 안함
  if (preloadContext.done) return null; // 작업이 끝났다면 아무것도 안함

  // promises 배열에 프로미스 등록
  // 설령 resolve 함수가 프로미스를 반환하지 않더라도, 프로미스를 취급하기 위해 Promise.resolve 사용
  preloadContext.promises.push(Promise.resolve(resolve()));
  return null;
};

// Preloadcontext는 SSR 과정에서 처리해야 할 작업을 실행하고,
// 기다려야 하는 프로미스가 있다면 이를 수집
// 수집된 프로미스들이 끝날 때까지 기다렸다가 다음에 다시 렌더링하면 데이터가 채워진 상태로
// 컴포넌트들이 나타남

// resolve 함수를 props로 받아오며,
// 컴포넌트가 렌더링될 때 서버 환경에서만 resolve 함수 호출
