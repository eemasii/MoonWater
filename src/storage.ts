import * as fs from 'fs';
import * as path from 'path';

export type RoddenRating = 'AA' | 'A' | 'B' | 'C' | 'DD' | 'X';
export type ChartCategory = 'Male' | 'Female' | 'Event' | 'Horary' | 'Mundane' | 'Other';

export interface SavedChart {
  id: string;
  name: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  houseSystem: string;
  zodiacMode: string;
  cityName?: string;
  roddenRating?: RoddenRating;
  category?: ChartCategory | string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export class ChartStorage {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.resolve('charts_database.json');
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public getAll(): SavedChart[] {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public getById(id: string): SavedChart | undefined {
    return this.getAll().find(c => c.id === id);
  }

  public save(chart: Omit<SavedChart, 'id' | 'createdAt'> & { id?: string }): SavedChart {
    const charts = this.getAll();
    const id = chart.id || `chart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existingIdx = charts.findIndex(c => c.id === id);
    const now = new Date().toISOString();

    const newEntry: SavedChart = {
      ...chart,
      roddenRating: chart.roddenRating || 'AA',
      category: chart.category || 'Male',
      notes: chart.notes || '',
      cityName: chart.cityName || '',
      id,
      createdAt: existingIdx >= 0 ? charts[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      charts[existingIdx] = newEntry;
    } else {
      charts.push(newEntry);
    }

    fs.writeFileSync(this.filePath, JSON.stringify(charts, null, 2), 'utf-8');
    return newEntry;
  }

  public delete(id: string): boolean {
    const charts = this.getAll();
    const filtered = charts.filter(c => c.id !== id);
    if (filtered.length !== charts.length) {
      fs.writeFileSync(this.filePath, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
    return false;
  }
}
