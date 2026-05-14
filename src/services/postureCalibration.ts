import { apiFetch, ApiError } from '@/src/services/api';
import type { BnoFrame, MpuFrame } from '@/src/services/posture';
import type { CalibrationNeutralSnapshot } from '@/src/utils/calibrationNeutral';

/** Same IMU/BNO frame shape as POST /posture/evaluate (minus session/evaluate-only fields). */
export type PostureCalibrateBody = {
  device_id: string;
  bno: BnoFrame;
  mpu1: MpuFrame;
  mpu2: MpuFrame;
};

export function calibrationSnapshotToCalibrateBody(
  registeredDeviceId: string,
  snap: CalibrationNeutralSnapshot,
): PostureCalibrateBody {
  return {
    device_id: registeredDeviceId,
    bno: {
      heading: snap.bno.heading,
      roll: snap.bno.roll,
      pitch: snap.bno.pitch,
    },
    mpu1: {
      Ax: snap.mpu1.ax,
      Ay: snap.mpu1.ay,
      Az: snap.mpu1.az,
      Gx: snap.mpu1.gx,
      Gy: snap.mpu1.gy,
      Gz: snap.mpu1.gz,
    },
    mpu2: {
      Ax: snap.mpu2.ax,
      Ay: snap.mpu2.ay,
      Az: snap.mpu2.az,
      Gx: snap.mpu2.gx,
      Gy: snap.mpu2.gy,
      Gz: snap.mpu2.gz,
    },
  };
}

function recordErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const c = (data as Record<string, unknown>).code;
  return typeof c === 'string' ? c : undefined;
}

export function isActiveSessionCalibrationError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    recordErrorCode(error.data) === 'ACTIVE_SESSION'
  );
}

export function isWrongDeviceCalibrationError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export type PostCalibrateResponse = {
  calibration: unknown;
  device_id?: string;
  updated_at?: string;
};

function unwrapPostCalibrate(data: unknown): PostCalibrateResponse {
  const root = (data ?? {}) as Record<string, unknown>;
  const inner =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;

  let calibration: unknown =
    inner.calibration !== undefined ? inner.calibration : root.calibration;
  if (calibration === undefined || calibration === null) {
    calibration = inner;
  }

  return {
    calibration,
    device_id:
      typeof inner.device_id === 'string'
        ? inner.device_id
        : typeof root.device_id === 'string'
          ? root.device_id
          : typeof (inner.device as Record<string, unknown> | undefined)?.id ===
              'string'
            ? String((inner.device as Record<string, unknown>).id)
            : undefined,
    updated_at:
      typeof inner.updated_at === 'string'
        ? inner.updated_at
        : typeof inner.updatedAt === 'string'
          ? inner.updatedAt
          : typeof root.updated_at === 'string'
            ? root.updated_at
            : undefined,
  };
}

export async function postPostureCalibrate(
  token: string,
  body: PostureCalibrateBody,
): Promise<PostCalibrateResponse> {
  const { data } = await apiFetch<unknown>('/posture/calibrate', {
    method: 'POST',
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  return unwrapPostCalibrate(data);
}

export type DeleteCalibrateResponse = {
  clearLocalCalibrationCache?: boolean;
};

export async function deletePostureCalibrate(
  token: string,
  deviceId: string,
): Promise<DeleteCalibrateResponse> {
  const q = encodeURIComponent(deviceId);
  const { data } = await apiFetch<unknown>(`/posture/calibrate?device_id=${q}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const obj = (data ?? {}) as Record<string, unknown>;
  return {
    clearLocalCalibrationCache: obj.clearLocalCalibrationCache === true,
  };
}

export type GetCalibrationResponse = {
  calibration: unknown | null;
};

export async function getPostureCalibration(
  token: string,
  deviceId: string,
): Promise<GetCalibrationResponse> {
  const q = encodeURIComponent(deviceId);
  const { data } = await apiFetch<unknown>(`/posture/calibration?device_id=${q}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const obj = (data ?? {}) as Record<string, unknown>;
  const cal = obj.calibration;
  return {
    calibration: cal === null || cal === undefined ? null : cal,
  };
}
