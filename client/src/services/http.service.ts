import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosRequestConfig,
  RawAxiosRequestHeaders,
} from 'axios';
import { IService, EHttpMethod } from '@/types';

class HttpService {
  private http: AxiosInstance;
  private baseURL = process.env.NEXT_PUBLIC_API_URL;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: this.setupHeaders(),
    });
  }

  // Initialize service configuration
  public service() {
    this.injectInterceptors();

    return this;
  }

  // Set up request headers
  private setupHeaders(
    hasAttachment = false,
    isCache = true
  ): RawAxiosRequestHeaders {
    const header =
      hasAttachment === true
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' };

    if (isCache) {
      return header;
    } else {
      return {
        ...header,
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Expires: '0',
      };
    }
  }

  // Handle HTTP requests
  private async request<T>(
    method: EHttpMethod,
    url: string,
    options: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.http.request<T>({
        method,
        url,
        ...options,
      });

      return response.data;
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  // Perform GET request
  public async get<T>(
    url: string,
    params?: IService.IParams,
    hasAttachment = false,
    isCache = true
  ): Promise<T> {
    return this.request<T>(EHttpMethod.GET, url, {
      params,
      headers: this.setupHeaders(hasAttachment, isCache),
    });
  }

  // Perform POST request
  public async push<T, P>(
    url: string,
    payload: P,
    params?: IService.IParams,
    hasAttachment = false
  ): Promise<T> {
    return this.request<T>(EHttpMethod.POST, url, {
      params,
      data: payload,
      headers: this.setupHeaders(hasAttachment),
    });
  }

  // Perform UPDATE request
  public async update<T, P>(
    url: string,
    payload: P,
    params?: IService.IParams,
    hasAttachment = false
  ): Promise<T> {
    return this.request<T>(EHttpMethod.PUT, url, {
      params,
      data: payload,
      headers: this.setupHeaders(hasAttachment),
    });
  }

  // Perform DELETE request
  public async remove<T>(
    url: string,
    params?: IService.IParams,
    hasAttachment = false
  ): Promise<T> {
    return this.request<T>(EHttpMethod.DELETE, url, {
      params,
      headers: this.setupHeaders(hasAttachment),
    });
  }

  // Perform PARTIAL UPDATE request
  public async modify<T, P>(
    url: string,
    payload: P,
    params?: IService.IParams,
    hasAttachment = false
  ): Promise<T> {
    return this.request<T>(EHttpMethod.PATCH, url, {
      params,
      data: payload,
      headers: this.setupHeaders(hasAttachment),
    });
  }

  // Inject interceptors for request and response
  private injectInterceptors() {
    // Set up request interceptor
    this.http.interceptors.request.use((request) => {
      // * Perform an action
      // TODO: implement an NProgress
      return request;
    });

    // Set up response interceptor
    this.http.interceptors.response.use(
      (response) => {
        // * Do something
        return response;
      },

      (error) => {
        // * Implement a global error alert
        return Promise.reject(error);
      }
    );
  }

  // Normalize errors
  private normalizeError(error: any) {
    return Promise.reject(error);
  }
}

export { HttpService as default };
