import { apiFetch } from '@/src/services/api';

export type DeviceDto = {
  id: string;
  user_id?: string;
  mac_address: string;
  device_name: string;
  battery_level: number | null;
  registered_at?: string;
  last_synced_at?: string | null;
};

export type RegisterDevicePayload = {
  mac_address: string;
  device_name: string;
};

// Backend responses for /devices/* wrap the row under a `device` key alongside
// a `success` flag (e.g. { success: true, device: { id, ... } }). Other routes
// in the codebase might return the flat row directly. Unwrap defensively so
// every consumer sees a flat `DeviceDto`.
const unwrapDevice = (raw: unknown): DeviceDto => {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const candidate =
    (obj.device as Record<string, unknown> | undefined) ??
    (obj.data as Record<string, unknown> | undefined) ??
    obj;
  const row = candidate as Record<string, unknown>;
  const id =
    (typeof row.id === 'string' && row.id) ||
    (typeof row.device_id === 'string' && row.device_id) ||
    '';
  return { ...(candidate as DeviceDto), id };
};

const unwrapDeviceList = (raw: unknown): DeviceDto[] => {
  if (Array.isArray(raw)) return raw as DeviceDto[];
  const obj = (raw ?? {}) as Record<string, unknown>;
  const candidate =
    (obj.devices as unknown) ??
    (obj.data as unknown) ??
    [];
  return Array.isArray(candidate) ? (candidate as DeviceDto[]) : [];
};

export const registerDevice = async (
  token: string,
  payload: RegisterDevicePayload,
): Promise<DeviceDto> => {
  const { data } = await apiFetch<unknown>('/devices/register', {
    method: 'POST',
    body: payload,
    headers: { Authorization: `Bearer ${token}` },
  });
  return unwrapDevice(data);
};

export const listDevices = async (token: string): Promise<DeviceDto[]> => {
  const { data } = await apiFetch<unknown>('/devices', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return unwrapDeviceList(data);
};

export const updateDeviceBattery = async (
  token: string,
  deviceId: string,
  batteryLevel: number,
): Promise<DeviceDto> => {
  const { data } = await apiFetch<unknown>(
    `/devices/${encodeURIComponent(deviceId)}/battery`,
    {
      method: 'PATCH',
      body: { battery_level: batteryLevel },
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return unwrapDevice(data);
};
