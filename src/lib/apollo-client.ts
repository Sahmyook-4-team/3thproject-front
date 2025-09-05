// src/lib/apollo-client.ts

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';


// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

const httpLink = createHttpLink({
  uri: '/graphql',  // 상대 경로로 변경
  credentials: 'same-origin', // 쿠키를 포함한 요청을 위해 추가
});

const authLink = setContext((_, { headers }) => {
  // --- [핵심 수정] ---
  // 키 이름을 'token'에서 'accessToken'으로 변경하여 AuthContext와 일치시킵니다.
  const token = localStorage.getItem('accessToken'); 

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;