/*!
 * Copyright 2020 Cognite AS
 */

import * as THREE from 'three';

import { createSectorMetadata, SectorTree } from '../../testutils/createSectorMetadata';
import { Box3 } from '../../../utilities/Box3';
import { GpuOrderSectorsByVisibilityCoverage, traverseDepthFirst } from '../../../internal';
import { SectorSceneImpl } from '../../../datamodels/cad/sector/SectorScene';
import { CadModelMetadata } from '../../../datamodels/cad/';
import { SectorScene, SectorMetadata } from '../../../datamodels/cad/sector/types';

describe('OrderSectorsByVisibilityCoverage', () => {
  const glContext: WebGLRenderingContext = require('gl')(64, 64);
  const renderSize = new THREE.Vector2(64, 64);
  const identityMatrix = new THREE.Matrix4().identity();
  const singleSectorScene = createStubScene([0, [], Box3.fromBounds(-1, -1, -1, 1, 1, 1)]);
  const cadModel = createStubModel('model', singleSectorScene, identityMatrix);

  test('orderSectorsByVisibility() returns empty array when there are no models', () => {
    // Arrange
    const camera = new THREE.PerspectiveCamera();
    const coverageUtil = new GpuOrderSectorsByVisibilityCoverage({ glContext, renderSize });

    // Act
    const arrays = coverageUtil.orderSectorsByVisibility(camera);

    // Assert
    expect(arrays).toBeEmpty();
  });

  test('rendered result has no sectors, returns empty array', () => {
    // Arrange
    const util = new GpuOrderSectorsByVisibilityCoverage({ glContext, renderSize });
    util.setModels([cadModel]);
    const camera = new THREE.PerspectiveCamera();

    // Act
    glContext.clearColor(1, 1, 1, 1);
    const result = util.orderSectorsByVisibility(camera);

    // Assert
    expect(result).toBeEmpty();
  });

  test('rendered result has one sector, returns array with priority 1', () => {
    // Arrange
    const util = new GpuOrderSectorsByVisibilityCoverage({ glContext, renderSize });
    util.setModels([cadModel]);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20.0);
    camera.position.set(0, 0, -10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Act
    glContext.clearColor(0, 0, 0, 1); // Store 0 in output
    const result = util.orderSectorsByVisibility(camera);

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].sectorId).toBe(0);
    expect(result[0].priority).toBe(1.0);
    expect(result[0].model).toBe(cadModel);
  });

  test('two models, rendered result returns value at offset', () => {
    // Arrange
    const scene2 = createStubScene([0, [], Box3.fromBounds(-1, -1, -1, 1, 1, 1)]);
    const model1 = createStubModel('model1', singleSectorScene, identityMatrix);
    const model2 = createStubModel('model2', scene2, identityMatrix);
    const util = new GpuOrderSectorsByVisibilityCoverage({ glContext, renderSize });
    util.setModels([model1, model2]);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20.0);
    camera.position.set(0, 0, -10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Act
    glContext.clearColor(0, 0, 1.0 / 255, 1); // Store 1 in output
    const result = util.orderSectorsByVisibility(camera);

    // Assert - ensure output is first sector in second model
    expect(result.length).toBe(1);
    expect(result[0].sectorId).toBe(0);
    expect(result[0].priority).toBe(1.0);
    expect(result[0].model).toBe(model2);
  });

  test('with clipping plane, sets renderer clipping planes', () => {
    // Arrange
    // Scene has one root with two children
    const scene = createStubScene([
      0,
      [
        // Split space in two along X axis
        [1, [], Box3.fromBounds(-1, -1, -1, -0.1, 1, 1)],
        [2, [], Box3.fromBounds(0.1, -1, -1, 1, 1, 1)]
      ],
      Box3.fromBounds(-1, -1, -1, 1, 1, 1)
    ]);
    const model = createStubModel('model1', scene, identityMatrix);
    const util = new GpuOrderSectorsByVisibilityCoverage({ glContext, renderSize });
    util.setModels([model]);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20.0);
    camera.position.set(0, 0, -10.0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    glContext.clearColor(0, 0, 0, 1);

    // Act
    const planes = [
      new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0))
    ];
    util.setClipping(planes, false);
    util.orderSectorsByVisibility(camera);

    // Assert
    expect(util.renderer.localClippingEnabled).toBeTrue();
  });
});

function createStubScene(tree: SectorTree): SectorScene {
  const sectorsMap = new Map<number, SectorMetadata>();
  const root = createSectorMetadata(tree);
  traverseDepthFirst(root, x => {
    sectorsMap.set(x.id, x);
    return true;
  });
  return new SectorSceneImpl(8, 1, 'Meters', root, sectorsMap);
}

function createStubModel(blobUrl: string, scene: SectorScene, modelMatrix: THREE.Matrix4) {
  const cadModel: CadModelMetadata = {
    blobUrl,
    modelMatrix,
    scene
  };
  return cadModel;
}
