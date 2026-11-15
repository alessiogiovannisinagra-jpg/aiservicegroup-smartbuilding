BEGIN;

ALTER TABLE devices
    DROP CONSTRAINT devices_asset_id_fkey;

ALTER TABLE devices
    ADD CONSTRAINT devices_asset_system_pair
    CHECK (asset_id IS NULL OR system_id IS NOT NULL);

ALTER TABLE devices
    ADD CONSTRAINT devices_asset_same_system
    FOREIGN KEY (asset_id, system_id)
    REFERENCES assets(id, system_id)
    ON DELETE SET NULL (asset_id);

COMMIT;
