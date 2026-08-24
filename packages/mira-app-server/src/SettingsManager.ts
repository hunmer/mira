import * as fs from 'fs';
import * as path from 'path';

export interface PluginSourceSetting {
    id: string;
    name: string;
    url: string;
}

export interface ServerSettings {
    authRequired: boolean;
    allowRegistration: boolean;
    /** 插件商店的 JSON 源列表（服务端存储，与前端插件商店共享） */
    pluginSources: PluginSourceSetting[];
    /** 当前应用的插件源 id */
    pluginSourceActive: string;
}

const DEFAULT_PLUGIN_SOURCES: PluginSourceSetting[] = [
    {
        id: 'official',
        name: '官方插件源',
        url: 'https://raw.githubusercontent.com/hunmer/mira/refs/heads/main/plugins/plugins/plugins.recommend.json',
    },
];

const DEFAULT_SETTINGS: ServerSettings = {
    authRequired: true,
    allowRegistration: true,
    pluginSources: DEFAULT_PLUGIN_SOURCES,
    pluginSourceActive: 'official',
};

export class SettingsManager {
    private settingsPath: string;
    private settings: ServerSettings;

    constructor(dataPath: string) {
        this.settingsPath = path.join(dataPath, 'settings.json');
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async initialize(): Promise<void> {
        try {
            const data = await fs.promises.readFile(this.settingsPath, 'utf8');
            const parsed = JSON.parse(data);
            this.settings = { ...DEFAULT_SETTINGS, pluginSources: [...DEFAULT_PLUGIN_SOURCES], ...parsed };
        } catch {
            this.settings = { ...DEFAULT_SETTINGS, pluginSources: [...DEFAULT_PLUGIN_SOURCES] };
            await this.save();
        }
    }

    getSettings(): ServerSettings {
        return { ...this.settings };
    }

    async updateSettings(partial: Partial<ServerSettings>): Promise<ServerSettings> {
        this.settings = { ...this.settings, ...partial };
        await this.save();
        return this.getSettings();
    }

    private async save(): Promise<void> {
        const dir = path.dirname(this.settingsPath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
    }
}
