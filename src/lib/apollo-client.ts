// --- [핵심 수정] 필요한 모든 것을 @apollo/client에서 직접 import 합니다. ---
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// 백엔드 GraphQL 서버 주소
const httpLink = createHttpLink({
  uri: 'http://localhost:8080/graphql', 
});

// 모든 요청에 JWT 토큰을 포함시키는 설정
const authLink = setContext((_, { headers }) => {
  // localStorage에서 토큰을 가져옵니다. (로그인 시 저장했다고 가정)
  const token = localStorage.getItem('token');
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