import * as fs from 'fs';
import * as path from 'path';

export interface ServerSettings {
    authRequired: boolean;
    allowRegistration: boolean;
}

const DEFAULT_SETTINGS: ServerSettings = {
    authRequired: true,
    allowRegistration: true,
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
            this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        } catch {
            this.settings = { ...DEFAULT_SETTINGS };
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
