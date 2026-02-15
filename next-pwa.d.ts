declare module 'next-pwa' {
    import { NextConfig } from 'next';
    function withPWA(config: {
        dest: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        skipWaiting?: boolean;
        runtimeCaching?: any[];
    }): (nextConfig: NextConfig) => NextConfig;
    export default withPWA;
}
