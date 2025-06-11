
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
  