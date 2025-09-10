"use client";

import { ApolloLink, HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  NextSSRApolloClient,
  NextSSRInMemoryCache,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { setContext } from '@apollo/client/link/context';

// 이 함수가 서버와 클라이언트 모두에서 Apollo Client를 생성합니다.
function makeClient() {
  const httpLink = new HttpLink({
    // 이 부분을 본인의 GraphQL 서버 주소로 설정해주세요.
    // .env 파일에 NEXT_PUBLIC_GRAPHQL_ENDPOINT="http://..." 와 같이 설정하는 것이 가장 좋습니다.
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:8080/graphql",
    fetchOptions: { cache: "no-store" }, // 인증이 필요한 요청은 캐시하지 않는 것이 안전합니다.
  });

  // 요청을 보내기 전에 헤더에 토큰을 추가하는 인증 링크입니다.
  const authLink = setContext((_, { headers }) => {
    // 브라우저 환경에서만 localStorage에 접근합니다.
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    // 기존 헤더에 Authorization 헤더를 추가하여 반환합니다.
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      }
    }
  });

  // Apollo Client 인스턴스를 생성합니다.
  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    // authLink를 httpLink 앞에 연결하여, 모든 요청에 인증 헤더가 먼저 추가되도록 합니다.
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            // 서버 사이드 렌더링(SSR) 환경일 때의 링크 체인
            new SSRMultipartLink({
              stripDefer: true,
            }),
            authLink.concat(httpLink),
          ])
        : authLink.concat(httpLink), // 클라이언트 사이드 환경일 때의 링크 체인
  });
}

// 이 Wrapper 컴포넌트가 layout.tsx에서 앱 전체를 감싸게 됩니다.
export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}