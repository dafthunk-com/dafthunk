// Dataset Types
export interface CreateDatasetRequest {
    name: string;
  }
  
  export interface CreateDatasetResponse {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface GetDatasetResponse {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ListDatasetsResponse {
    datasets: {
      id: string;
      name: string;
      handle: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }
  
  export interface UpdateDatasetRequest {
    name: string;
  }
  
  export interface UpdateDatasetResponse {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface DeleteDatasetResponse {
    id: string;
  }
  
  // Dataset File Types
  export interface DatasetFile {
    key: string;
    size: number;
    uploaded: string;
  }
  
  export interface ListDatasetFilesResponse {
    files: DatasetFile[];
  }
  
  export interface UploadDatasetFileResponse {
    success: boolean;
    path: string;
    filename: string;
    size: number;
    type: string;
  }
  
  export interface DeleteDatasetFileResponse {
    success: boolean;
    path: string;
  }
  