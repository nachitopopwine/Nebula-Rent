import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

// El frontend solo conoce al BFF: un único endpoint GraphQL.
// En Kubernetes el ingress enruta /graphql → servicio "bff".
export const cliente = new ApolloClient({
  link: new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL ?? "/graphql" }),
  cache: new InMemoryCache(),
});
