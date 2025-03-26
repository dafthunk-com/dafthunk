// Base ParameterType class
export abstract class ParameterType {
  abstract validate(value: any): { isValid: boolean; error?: string };
  abstract serialize(value: any): any;
  abstract deserialize(value: any): any;
  abstract getDefaultValue(): any;
}

// String ParameterType
export class StringParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== "string") {
      return { isValid: false, error: "Value must be a string" };
    }
    return { isValid: true };
  }

  serialize(value: any): string {
    return String(value);
  }

  deserialize(value: any): string {
    return String(value);
  }

  getDefaultValue(): string {
    return "";
  }
}

// Number ParameterType
export class NumberParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== "number" || isNaN(value)) {
      return { isValid: false, error: "Value must be a valid number" };
    }
    return { isValid: true };
  }

  serialize(value: any): number {
    return Number(value);
  }

  deserialize(value: any): number {
    return Number(value);
  }

  getDefaultValue(): number {
    return 0;
  }
}

// Boolean ParameterType
export class BooleanParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== "boolean") {
      return { isValid: false, error: "Value must be a boolean" };
    }
    return { isValid: true };
  }

  serialize(value: any): boolean {
    return Boolean(value);
  }

  deserialize(value: any): boolean {
    return Boolean(value);
  }

  getDefaultValue(): boolean {
    return false;
  }
}

// Array ParameterType
export class ArrayParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    if (!Array.isArray(value)) {
      return { isValid: false, error: "Value must be an array" };
    }
    return { isValid: true };
  }

  serialize(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  deserialize(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  getDefaultValue(): any[] {
    return [];
  }
}

// Binary ParameterType
export class BinaryParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    if (!(value instanceof Uint8Array)) {
      return { isValid: false, error: "Value must be a Uint8Array" };
    }
    return { isValid: true };
  }

  serialize(value: any): Uint8Array {
    return value instanceof Uint8Array ? value : new Uint8Array();
  }

  deserialize(value: any): Uint8Array {
    return value instanceof Uint8Array ? value : new Uint8Array();
  }

  getDefaultValue(): Uint8Array {
    return new Uint8Array();
  }
}

// JSON ParameterType
export class JsonParameterType extends ParameterType {
  validate(value: any): { isValid: boolean; error?: string } {
    try {
      if (typeof value !== "object" || value === null) {
        return { isValid: false, error: "Value must be a JSON object" };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "Invalid JSON value" };
    }
  }

  serialize(value: any): any {
    return value;
  }

  deserialize(value: any): any {
    return value;
  }

  getDefaultValue(): Record<string, any> {
    return {};
  }
}

// Image ParameterType
export class ImageParameterType extends ParameterType {
  private static readonly VALID_MIME_TYPES = [
    'image/jpeg',
    'image/png'
  ];

  validate(value: any): { isValid: boolean; error?: string } {
    if (!value || typeof value !== 'object') {
      return { isValid: false, error: "Value must be an object with data and mimeType" };
    }
    
    if (!(value.data instanceof Uint8Array)) {
      return { isValid: false, error: "Image data must be a Uint8Array" };
    }
    
    if (typeof value.mimeType !== 'string' || !ImageParameterType.VALID_MIME_TYPES.includes(value.mimeType)) {
      return { 
        isValid: false, 
        error: `mimeType must be one of: ${ImageParameterType.VALID_MIME_TYPES.join(', ')}` 
      };
    }
    
    return { isValid: true };
  }

  serialize(value: any): { data: Uint8Array; mimeType: string } {
    if (this.validate(value).isValid) {
      return {
        data: value.data,
        mimeType: value.mimeType
      };
    }
    return {
      data: new Uint8Array(),
      mimeType: 'image/png'
    };
  }

  deserialize(value: any): { data: Uint8Array; mimeType: string } {
    if (this.validate(value).isValid) {
      return {
        data: value.data,
        mimeType: value.mimeType
      };
    }
    return {
      data: new Uint8Array(),
      mimeType: 'image/png'
    };
  }

  getDefaultValue(): { data: Uint8Array; mimeType: string } {
    return {
      data: new Uint8Array(),
      mimeType: 'image/png'
    };
  }
}

// Audio ParameterType
export class AudioParameterType extends ParameterType {
  private static readonly VALID_MIME_TYPES = [
    'audio/mpeg'  // MP3 format
  ];

  validate(value: any): { isValid: boolean; error?: string } {
    if (!value || typeof value !== 'object') {
      return { isValid: false, error: "Value must be an object with data and mimeType" };
    }
    
    if (!(value.data instanceof Uint8Array)) {
      return { isValid: false, error: "Audio data must be a Uint8Array" };
    }
    
    if (typeof value.mimeType !== 'string' || !AudioParameterType.VALID_MIME_TYPES.includes(value.mimeType)) {
      return { 
        isValid: false, 
        error: `mimeType must be one of: ${AudioParameterType.VALID_MIME_TYPES.join(', ')}` 
      };
    }
    
    return { isValid: true };
  }

  serialize(value: any): { data: Uint8Array; mimeType: string } {
    if (this.validate(value).isValid) {
      return {
        data: value.data,
        mimeType: value.mimeType
      };
    }
    return {
      data: new Uint8Array(),
      mimeType: 'audio/mpeg'
    };
  }

  deserialize(value: any): { data: Uint8Array; mimeType: string } {
    if (this.validate(value).isValid) {
      return {
        data: value.data,
        mimeType: value.mimeType
      };
    }
    return {
      data: new Uint8Array(),
      mimeType: 'audio/mpeg'
    };
  }

  getDefaultValue(): { data: Uint8Array; mimeType: string } {
    return {
      data: new Uint8Array(),
      mimeType: 'audio/mpeg'
    };
  }
} 