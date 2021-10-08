/*!
 * Copyright 2021 Cognite AS
 */

import * as THREE from 'three';

import { PointCloudMetadata } from './PointCloudMetadata';
import { MetadataRepository } from '../base';

import { transformCameraConfiguration } from '@reveal/utilities';

import { ModelDataClient, File3dFormat, ModelMetadataProvider } from '@reveal/modeldata-api';

type ModelIdentifierWithFormat<T> = T & { format: File3dFormat };

const identityMatrix = new THREE.Matrix4().identity();

export class PointCloudMetadataRepository<TModelIdentifier>
  implements MetadataRepository<TModelIdentifier, Promise<PointCloudMetadata>>
{
  private readonly _modelMetadataProvider: ModelMetadataProvider<ModelIdentifierWithFormat<TModelIdentifier>>;
  private readonly _modelDataClient: ModelDataClient;
  private readonly _blobFileName: string;

  constructor(
    modelMetadataProvider: ModelMetadataProvider<TModelIdentifier>,
    modelDataClient: ModelDataClient,
    blobFileName: string = 'ept.json'
  ) {
    this._modelMetadataProvider = modelMetadataProvider;
    this._modelDataClient = modelDataClient;
    this._blobFileName = blobFileName;
  }

  async loadData(modelIdentifier: TModelIdentifier): Promise<PointCloudMetadata> {
    const idWithFormat = { format: File3dFormat.EptPointCloud, ...modelIdentifier };
    const baseUrlPromise = this._modelMetadataProvider.getModelUri(idWithFormat);
    const modelMatrixPromise = this._modelMetadataProvider.getModelMatrix(idWithFormat);
    const cameraConfigurationPromise = this._modelMetadataProvider.getModelCamera(idWithFormat);

    const modelBaseUrl = await baseUrlPromise;
    const modelMatrix = await modelMatrixPromise;
    const scene = await this._modelDataClient.getJsonFile(modelBaseUrl, this._blobFileName);
    const cameraConfiguration = await cameraConfigurationPromise;
    return {
      modelBaseUrl,
      modelMatrix,
      cameraConfiguration: transformCameraConfiguration(cameraConfiguration, identityMatrix),
      scene
    };
  }
}
