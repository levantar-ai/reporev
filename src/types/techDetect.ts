export type TechDetectStep =
  | 'idle'
  | 'fetching-tree'
  | 'fetching-files'
  | 'analyzing'
  | 'done'
  | 'error';

export interface DetectedAWSService {
  service: string;
  sdkPackage?: string;
  source: string;
  via: 'js-sdk-v3' | 'js-sdk-v2' | 'boto3' | 'cloudformation' | 'terraform' | 'cdk';
}

export interface DetectedAzureService {
  service: string;
  sdkPackage?: string;
  source: string;
  via: 'terraform' | 'arm-template' | 'bicep' | 'npm-sdk' | 'python-sdk';
}

export interface DetectedGCPService {
  service: string;
  sdkPackage?: string;
  source: string;
  via: 'terraform' | 'npm-sdk' | 'python-sdk';
}

export interface DetectedPythonPackage {
  name: string;
  version?: string;
  source: string;
}

export interface DetectedPackage {
  name: string;
  version?: string;
  source: string;
}

export interface TechDetectResult {
  aws: DetectedAWSService[];
  azure: DetectedAzureService[];
  gcp: DetectedGCPService[];
  python: DetectedPythonPackage[];
  node: DetectedPackage[];
  go: DetectedPackage[];
  java: DetectedPackage[];
  php: DetectedPackage[];
  rust: DetectedPackage[];
  ruby: DetectedPackage[];
  manifestFiles: string[];
}

export interface TechDetectState {
  step: TechDetectStep;
  progress: number;
  statusMessage: string;
  result: TechDetectResult | null;
  error: string | null;
}
