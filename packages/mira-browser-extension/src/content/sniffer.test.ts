// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { extractFromDOM, mergeResources, isMediaInitiator, urlToId } from './sniffer';

describe('sniffer', () => {
  it('urlToId 对相同 url 返回相同 id', () => {
    expect(urlToId('http://a.com/1.png')).toBe(urlToId('http://a.com/1.png'));
    expect(urlToId('http://a.com/1.png')).not.toBe(urlToId('http://a.com/2.png'));
  });

  it('extractFromDOM 提取 img 资源', () => {
    document.body.innerHTML = '<img src="http://a/1.png" width="100" height="50">';
    const resources = extractFromDOM(['image']);
    expect(resources).toHaveLength(1);
    expect(resources[0].url).toBe('http://a/1.png');
    expect(resources[0].kind).toBe('image');
  });

  it('extractFromDOM 过滤 data url', () => {
    document.body.innerHTML = '<img src="data:image/png;base64,abc">';
    expect(extractFromDOM(['image'])).toHaveLength(0);
  });

  it('extractFromDOM 过滤小尺寸图标', () => {
    const img = document.createElement('img');
    img.src = 'http://a/tiny.png';
    Object.defineProperty(img, 'naturalWidth', { value: 16 });
    Object.defineProperty(img, 'naturalHeight', { value: 16 });
    document.body.innerHTML = '';
    document.body.appendChild(img);
    expect(extractFromDOM(['image'])).toHaveLength(0);
  });

  it('extractFromDOM 提取 video 和 poster', () => {
    document.body.innerHTML = '<video src="http://a/v.mp4" poster="http://a/p.jpg"></video>';
    const resources = extractFromDOM(['video']);
    expect(resources).toHaveLength(1);
    expect(resources[0].url).toBe('http://a/v.mp4');
    expect(resources[0].poster).toBe('http://a/p.jpg');
  });

  it('extractFromDOM 提取 audio', () => {
    document.body.innerHTML = '<audio src="http://a/sound.mp3"></audio>';
    const resources = extractFromDOM(['audio']);
    expect(resources[0].kind).toBe('audio');
  });

  it('extractFromDOM 提取 background-image', () => {
    const div = document.createElement('div');
    div.style.backgroundImage = 'url(http://a/bg.png)';
    document.body.innerHTML = '';
    document.body.appendChild(div);
    const resources = extractFromDOM(['image']);
    expect(resources.some(r => r.url === 'http://a/bg.png')).toBe(true);
  });

  it('mergeResources 按 url 去重并累加 occurrences', () => {
    const existing = [{ id: '1', url: 'http://a/1.png', kind: 'image' as const, source: 'dom' as const, occurrences: 1, sniffedAt: 0 }];
    const incoming = [{ id: '1', url: 'http://a/1.png', kind: 'image' as const, source: 'perf' as const, occurrences: 1, sniffedAt: 1 }];
    const merged = mergeResources(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].occurrences).toBe(2);
  });

  it('isMediaInitiator 识别 img/video/audio', () => {
    expect(isMediaInitiator('img')).toBe(true);
    expect(isMediaInitiator('video')).toBe(true);
    expect(isMediaInitiator('audio')).toBe(true);
    expect(isMediaInitiator('fetch')).toBe(false);
  });
});
