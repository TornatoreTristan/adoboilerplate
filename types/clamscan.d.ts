// Ambient module declaration for the clamscan package, which doesn't ship its
// own typings. The shape covers what AntivirusService consumes today; widen
// it as we wire more of the API.

declare module 'clamscan' {
  interface ClamScanOptions {
    removeInfected?: boolean
    quarantineInfected?: boolean | string
    scanLog?: string | null
    debugMode?: boolean
    fileList?: string | null
    scanRecursively?: boolean
    clamscan?: {
      path?: string
      db?: string | null
      scanArchives?: boolean
      active?: boolean
    }
    clamdscan?: {
      socket?: string
      host?: string
      port?: number
      timeout?: number
      localFallback?: boolean
      path?: string
      configFile?: string | null
      multiscan?: boolean
      reloadDb?: boolean
      active?: boolean
      bypassRest?: boolean
    }
    preference?: 'clamscan' | 'clamdscan'
  }

  interface ScanResult {
    isInfected: boolean
    viruses: string[]
    file: string
  }

  class ClamScan {
    init(options?: ClamScanOptions): Promise<ClamScan>
    isInfected(filePath: string): Promise<ScanResult>
    scanStream(stream: NodeJS.ReadableStream | Buffer): Promise<{
      isInfected: boolean
      viruses?: string[]
    }>
    scanDir(path: string): Promise<{ goodFiles: string[]; badFiles: string[] }>
    scanFiles(paths: string[]): Promise<{ goodFiles: string[]; badFiles: string[] }>
    getVersion(): Promise<string>
  }

  export = ClamScan
}
