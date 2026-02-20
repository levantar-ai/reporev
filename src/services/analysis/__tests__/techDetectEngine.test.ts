import { describe, it, expect } from 'vitest';
import {
  detectAWS,
  detectPython,
  detectAzure,
  detectGCP,
  detectGo,
  detectJava,
  detectNode,
  detectPHP,
  detectRust,
  detectRuby,
} from '../techDetectEngine';

describe('detectAWS', () => {
  it('detects JS SDK v3 packages', () => {
    const files = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: {
            '@aws-sdk/client-s3': '^3.0.0',
            '@aws-sdk/client-dynamodb': '^3.0.0',
          },
        }),
      },
    ];
    const result = detectAWS(files);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.service)).toContain('S3');
    expect(result.map((r) => r.service)).toContain('DynamoDB');
  });

  it('detects Terraform aws_ resources', () => {
    const files = [
      {
        path: 'main.tf',
        content:
          'resource "aws_s3_bucket" "my_bucket" {}\nresource "aws_lambda_function" "my_func" {}',
      },
    ];
    const result = detectAWS(files);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((r) => r.service)).toContain('S3');
    expect(result.map((r) => r.service)).toContain('Lambda');
  });

  it('returns empty for no matches', () => {
    const files = [{ path: 'package.json', content: '{"dependencies":{}}' }];
    expect(detectAWS(files)).toHaveLength(0);
  });
});

describe('detectPython', () => {
  it('parses requirements.txt', () => {
    const files = [
      {
        path: 'requirements.txt',
        content: 'django>=4.0\nflask==2.0.1\nrequests\n',
      },
    ];
    const result = detectPython(files);
    expect(result.length).toBe(3);
    expect(result.map((r) => r.name)).toContain('django');
    expect(result.map((r) => r.name)).toContain('flask');
  });
});

describe('detectAzure', () => {
  it('detects Terraform azurerm resources', () => {
    const files = [
      {
        path: 'main.tf',
        content:
          'resource "azurerm_storage_account" "example" {}\nresource "azurerm_kubernetes_cluster" "aks" {}',
      },
    ];
    const result = detectAzure(files);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((r) => r.service)).toContain('Storage');
    expect(result.map((r) => r.service)).toContain('AKS');
  });

  it('detects npm @azure packages', () => {
    const files = [
      {
        path: 'package.json',
        content: JSON.stringify({ dependencies: { '@azure/storage-blob': '^12.0.0' } }),
      },
    ];
    const result = detectAzure(files);
    expect(result.length).toBe(1);
    expect(result[0].via).toBe('npm-sdk');
  });
});

describe('detectGCP', () => {
  it('detects Terraform google resources', () => {
    const files = [
      {
        path: 'main.tf',
        content:
          'resource "google_storage_bucket" "bucket" {}\nresource "google_bigquery_dataset" "ds" {}',
      },
    ];
    const result = detectGCP(files);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((r) => r.service)).toContain('Cloud Storage');
    expect(result.map((r) => r.service)).toContain('BigQuery');
  });

  it('detects npm @google-cloud packages', () => {
    const files = [
      {
        path: 'package.json',
        content: JSON.stringify({ dependencies: { '@google-cloud/storage': '^6.0.0' } }),
      },
    ];
    const result = detectGCP(files);
    expect(result.length).toBe(1);
  });
});

describe('detectGo', () => {
  it('parses go.mod require block', () => {
    const files = [
      {
        path: 'go.mod',
        content:
          'module example.com/app\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgolang.org/x/net v0.0.0\n)\n',
      },
    ];
    const result = detectGo(files);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((r) => r.name.includes('gin'))).toBe(true);
  });
});

describe('detectJava', () => {
  it('parses pom.xml dependencies', () => {
    const files = [
      {
        path: 'pom.xml',
        content:
          '<project><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><version>5.3.0</version></dependency></dependencies></project>',
      },
    ];
    const result = detectJava(files);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('org.springframework:spring-core');
  });
});

describe('detectNode', () => {
  it('parses package.json dependencies', () => {
    const files = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: { react: '^18.0.0', express: '^4.0.0' },
          devDependencies: { typescript: '^5.0.0' },
        }),
      },
    ];
    const result = detectNode(files);
    expect(result.length).toBe(3);
  });

  it('skips cloud SDK packages', () => {
    const files = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: { '@aws-sdk/client-s3': '^3.0.0', react: '^18.0.0' },
        }),
      },
    ];
    const result = detectNode(files);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('react');
  });
});

describe('detectPHP', () => {
  it('parses composer.json', () => {
    const files = [
      {
        path: 'composer.json',
        content: JSON.stringify({
          require: { php: '>=8.0', 'laravel/framework': '^10.0' },
          'require-dev': { 'phpunit/phpunit': '^10.0' },
        }),
      },
    ];
    const result = detectPHP(files);
    expect(result.length).toBe(2);
    // Should skip 'php'
    expect(result.map((r) => r.name)).not.toContain('php');
  });
});

describe('detectRust', () => {
  it('parses Cargo.toml dependencies', () => {
    const files = [
      {
        path: 'Cargo.toml',
        content:
          '[package]\nname = "myapp"\nversion = "0.1.0"\n\n[dependencies]\nserde = "1.0"\ntokio = { version = "1.0", features = ["full"] }\n',
      },
    ];
    const result = detectRust(files);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.name)).toContain('serde');
    expect(result.map((r) => r.name)).toContain('tokio');
  });
});

describe('detectRuby', () => {
  it('parses Gemfile', () => {
    const files = [
      {
        path: 'Gemfile',
        content: 'source "https://rubygems.org"\n\ngem "rails", "~> 7.0"\ngem "puma", "~> 5.0"\n',
      },
    ];
    const result = detectRuby(files);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.name)).toContain('rails');
  });
});
