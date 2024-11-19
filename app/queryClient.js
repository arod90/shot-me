import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
  },
});

// Add a default export component to fix the warning
const QueryClientComponent = () => null;
QueryClientComponent.client = queryClient;

export default QueryClientComponent;
