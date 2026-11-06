-- Separate service hierarchy, management, membership, and change history from
-- the main service catalog. Legacy columns stay in place during the transition.
CREATE TABLE "service_hierarchies" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_hierarchies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_managers" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "manager_id" INTEGER NOT NULL,
    "role" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_managers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_members" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "position" VARCHAR(100),
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_histories" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_histories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_hierarchies_service_id_key" ON "service_hierarchies"("service_id");
CREATE INDEX "service_hierarchies_parent_id_idx" ON "service_hierarchies"("parent_id");
CREATE INDEX "service_hierarchies_level_idx" ON "service_hierarchies"("level");

CREATE INDEX "service_managers_manager_id_idx" ON "service_managers"("manager_id");
CREATE INDEX "service_managers_service_id_is_primary_end_date_idx" ON "service_managers"("service_id", "is_primary", "end_date");
CREATE INDEX "service_managers_service_id_manager_id_end_date_idx" ON "service_managers"("service_id", "manager_id", "end_date");
CREATE UNIQUE INDEX "service_managers_one_active_primary_per_service_idx"
    ON "service_managers"("service_id")
    WHERE "is_primary" = true AND "end_date" IS NULL;
CREATE UNIQUE INDEX "service_managers_one_active_assignment_idx"
    ON "service_managers"("service_id", "manager_id")
    WHERE "end_date" IS NULL;

CREATE INDEX "service_members_user_id_idx" ON "service_members"("user_id");
CREATE INDEX "service_members_service_id_is_active_idx" ON "service_members"("service_id", "is_active");
CREATE INDEX "service_members_service_id_user_id_idx" ON "service_members"("service_id", "user_id");
CREATE UNIQUE INDEX "service_members_one_active_assignment_idx"
    ON "service_members"("service_id", "user_id")
    WHERE "end_date" IS NULL;
CREATE UNIQUE INDEX "service_members_one_current_service_per_user_idx"
    ON "service_members"("user_id")
    WHERE "end_date" IS NULL;

CREATE INDEX "service_histories_service_id_created_at_idx" ON "service_histories"("service_id", "created_at");
CREATE INDEX "service_histories_user_id_idx" ON "service_histories"("user_id");

ALTER TABLE "service_hierarchies"
    ADD CONSTRAINT "service_hierarchies_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_hierarchies"
    ADD CONSTRAINT "service_hierarchies_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_hierarchies"
    ADD CONSTRAINT "service_hierarchies_not_self_parent"
    CHECK ("parent_id" IS NULL OR "parent_id" <> "service_id");

ALTER TABLE "service_managers"
    ADD CONSTRAINT "service_managers_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_managers"
    ADD CONSTRAINT "service_managers_manager_id_fkey"
    FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_members"
    ADD CONSTRAINT "service_members_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_members"
    ADD CONSTRAINT "service_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_histories"
    ADD CONSTRAINT "service_histories_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_histories"
    ADD CONSTRAINT "service_histories_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Repair any pre-existing cycles before migrating the parent links. The
-- lowest service ID in each detected cycle becomes its root; descendants stay
-- attached to that root.
DO $$
DECLARE
    cycle_service_id INTEGER;
BEGIN
    LOOP
        WITH RECURSIVE walk(current_id, path, cycle_found) AS (
            SELECT service."id", ARRAY[service."id"]::INTEGER[], false
            FROM "services" service
            UNION ALL
            SELECT parent."id", walk.path || parent."id", parent."id" = ANY(walk.path)
            FROM walk
            JOIN "services" current_service ON current_service."id" = walk.current_id
            JOIN "services" parent ON parent."id" = current_service."parent_id"
            WHERE current_service."parent_id" IS NOT NULL AND NOT walk.cycle_found
        )
        SELECT MIN(current_id)
        INTO cycle_service_id
        FROM walk
        WHERE cycle_found;

        EXIT WHEN cycle_service_id IS NULL;

        UPDATE "services"
        SET "parent_id" = NULL
        WHERE "id" = cycle_service_id;
    END LOOP;
END $$;

-- Backfill every catalog entry so roots and attached services now have a
-- dedicated hierarchy record.
WITH RECURSIVE levels(service_id, level, visited) AS (
    SELECT "id", 1, ARRAY["id"]::INTEGER[]
    FROM "services"
    WHERE "parent_id" IS NULL
    UNION ALL
    SELECT child."id", levels.level + 1, levels.visited || child."id"
    FROM "services" child
    JOIN levels ON child."parent_id" = levels.service_id
    WHERE NOT child."id" = ANY(levels.visited)
)
INSERT INTO "service_hierarchies" ("service_id", "parent_id", "level", "created_at")
SELECT service."id", service."parent_id", COALESCE(levels.level, 1), service."created_at"
FROM "services" service
LEFT JOIN levels ON levels.service_id = service."id";

INSERT INTO "service_managers" ("service_id", "manager_id", "role", "is_primary", "start_date", "created_at")
SELECT service."id", service."manager_id", 'Responsable principal', true, service."created_at", service."created_at"
FROM "services" service
WHERE service."manager_id" IS NOT NULL;

INSERT INTO "service_members" ("service_id", "user_id", "position", "start_date", "is_active", "created_at")
SELECT users."service_id", users."id", users."position", users."created_at", users."is_active", users."created_at"
FROM "users"
WHERE users."service_id" IS NOT NULL;

-- Retain historical service changes already captured by the general audit log.
CREATE FUNCTION "service_history_json_value"(raw_value TEXT) RETURNS JSONB AS $$
BEGIN
    IF raw_value IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN raw_value::JSONB;
EXCEPTION WHEN others THEN
    RETURN to_jsonb(raw_value);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

INSERT INTO "service_histories" (
    "service_id", "user_id", "action", "description", "old_data", "new_data", "created_at"
)
SELECT service."id", audit."user_id", audit."action", audit."details",
       "service_history_json_value"(audit."old_value"),
       "service_history_json_value"(audit."new_value"),
       audit."created_at"
FROM "audit_logs" audit
JOIN "services" service ON service."id"::TEXT = audit."entity_id"
WHERE audit."entity_type" ILIKE 'service';

DROP FUNCTION "service_history_json_value"(TEXT);

-- Protect both hierarchy representations against cycles, including writes
-- that bypass the HTTP controllers.
CREATE FUNCTION "prevent_service_parent_cycle"() RETURNS TRIGGER AS $$
DECLARE
    has_cycle BOOLEAN;
BEGIN
    IF NEW."parent_id" IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW."parent_id" = NEW."id" THEN
        RAISE EXCEPTION 'A service cannot be its own parent.' USING ERRCODE = '23514';
    END IF;

    WITH RECURSIVE ancestors(service_id, parent_id, visited, cycle_found) AS (
        SELECT service."id", service."parent_id", ARRAY[service."id"]::INTEGER[], false
        FROM "services" service
        WHERE service."id" = NEW."parent_id"
        UNION ALL
        SELECT parent."id", parent."parent_id", ancestors.visited || parent."id",
               parent."id" = ANY(ancestors.visited)
        FROM ancestors
        JOIN "services" parent ON parent."id" = ancestors.parent_id
        WHERE ancestors.parent_id IS NOT NULL AND NOT ancestors.cycle_found
    )
    SELECT EXISTS (
        SELECT 1 FROM ancestors
        WHERE service_id = NEW."id" OR cycle_found
    ) INTO has_cycle;

    IF has_cycle THEN
        RAISE EXCEPTION 'A service hierarchy cannot contain cycles.' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "services_prevent_parent_cycle"
BEFORE INSERT OR UPDATE OF "parent_id" ON "services"
FOR EACH ROW EXECUTE FUNCTION "prevent_service_parent_cycle"();

CREATE FUNCTION "prevent_service_hierarchy_cycle"() RETURNS TRIGGER AS $$
DECLARE
    has_cycle BOOLEAN;
BEGIN
    IF NEW."parent_id" IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW."parent_id" = NEW."service_id" THEN
        RAISE EXCEPTION 'A service cannot be its own parent.' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "service_hierarchies" WHERE "service_id" = NEW."parent_id"
    ) THEN
        RAISE EXCEPTION 'The parent service must have a hierarchy record.' USING ERRCODE = '23503';
    END IF;

    WITH RECURSIVE ancestors(service_id, parent_id, visited, cycle_found) AS (
        SELECT hierarchy."service_id", hierarchy."parent_id",
               ARRAY[hierarchy."service_id"]::INTEGER[], false
        FROM "service_hierarchies" hierarchy
        WHERE hierarchy."service_id" = NEW."parent_id"
        UNION ALL
        SELECT parent."service_id", parent."parent_id", ancestors.visited || parent."service_id",
               parent."service_id" = ANY(ancestors.visited)
        FROM ancestors
        JOIN "service_hierarchies" parent ON parent."service_id" = ancestors.parent_id
        WHERE ancestors.parent_id IS NOT NULL AND NOT ancestors.cycle_found
    )
    SELECT EXISTS (
        SELECT 1 FROM ancestors
        WHERE service_id = NEW."service_id" OR cycle_found
    ) INTO has_cycle;

    IF has_cycle THEN
        RAISE EXCEPTION 'A service hierarchy cannot contain cycles.' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "service_hierarchies_prevent_cycles"
BEFORE INSERT OR UPDATE OF "service_id", "parent_id" ON "service_hierarchies"
FOR EACH ROW EXECUTE FUNCTION "prevent_service_hierarchy_cycle"();

-- Keep hierarchy levels correct after direct edits to either representation.
CREATE FUNCTION "recalculate_service_hierarchy_levels"() RETURNS VOID AS $$
BEGIN
    WITH RECURSIVE levels(service_id, level, visited) AS (
        SELECT hierarchy."service_id", 1, ARRAY[hierarchy."service_id"]::INTEGER[]
        FROM "service_hierarchies" hierarchy
        WHERE hierarchy."parent_id" IS NULL
        UNION ALL
        SELECT child."service_id", levels.level + 1, levels.visited || child."service_id"
        FROM "service_hierarchies" child
        JOIN levels ON child."parent_id" = levels.service_id
        WHERE NOT child."service_id" = ANY(levels.visited)
    )
    UPDATE "service_hierarchies" hierarchy
    SET "level" = levels.level
    FROM levels
    WHERE hierarchy."service_id" = levels.service_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "sync_service_hierarchy_from_legacy"() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD."parent_id" IS DISTINCT FROM NEW."parent_id" THEN
        INSERT INTO "service_hierarchies" ("service_id", "parent_id", "level")
        VALUES (NEW."id", NEW."parent_id", 1)
        ON CONFLICT ("service_id") DO UPDATE
        SET "parent_id" = EXCLUDED."parent_id"
        WHERE "service_hierarchies"."parent_id" IS DISTINCT FROM EXCLUDED."parent_id";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "services_sync_hierarchy"
AFTER INSERT OR UPDATE OF "parent_id" ON "services"
FOR EACH ROW EXECUTE FUNCTION "sync_service_hierarchy_from_legacy"();

CREATE FUNCTION "sync_service_hierarchy_to_legacy"() RETURNS TRIGGER AS $$
BEGIN
    UPDATE "services"
    SET "parent_id" = NEW."parent_id"
    WHERE "id" = NEW."service_id"
      AND "parent_id" IS DISTINCT FROM NEW."parent_id";
    PERFORM "recalculate_service_hierarchy_levels"();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "service_hierarchies_sync_legacy"
AFTER INSERT OR UPDATE OF "parent_id" ON "service_hierarchies"
FOR EACH ROW EXECUTE FUNCTION "sync_service_hierarchy_to_legacy"();

-- Keep legacy manager_id and the dated assignment history synchronized.
CREATE FUNCTION "refresh_service_legacy_manager"(target_service_id INTEGER) RETURNS VOID AS $$
DECLARE
    active_manager_id INTEGER;
BEGIN
    SELECT assignment."manager_id"
    INTO active_manager_id
    FROM "service_managers" assignment
    WHERE assignment."service_id" = target_service_id
      AND assignment."is_primary" = true
      AND assignment."end_date" IS NULL
    ORDER BY assignment."id" DESC
    LIMIT 1;

    UPDATE "services"
    SET "manager_id" = active_manager_id
    WHERE "id" = target_service_id
      AND "manager_id" IS DISTINCT FROM active_manager_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "sync_service_manager_from_legacy"() RETURNS TRIGGER AS $$
DECLARE
    affected_rows INTEGER;
    current_manager_id INTEGER;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD."manager_id" IS NOT DISTINCT FROM NEW."manager_id" THEN
        RETURN NEW;
    END IF;

    SELECT assignment."manager_id"
    INTO current_manager_id
    FROM "service_managers" assignment
    WHERE assignment."service_id" = NEW."id"
      AND assignment."is_primary" = true
      AND assignment."end_date" IS NULL
    ORDER BY assignment."id" DESC
    LIMIT 1;

    IF current_manager_id IS NOT DISTINCT FROM NEW."manager_id" THEN
        RETURN NEW;
    END IF;

    UPDATE "service_managers"
    SET "is_primary" = false, "end_date" = NOW()
    WHERE "service_id" = NEW."id"
      AND "is_primary" = true
      AND "end_date" IS NULL;

    IF NEW."manager_id" IS NOT NULL THEN
        UPDATE "service_managers"
        SET "role" = 'Responsable principal', "is_primary" = true
        WHERE "service_id" = NEW."id"
          AND "manager_id" = NEW."manager_id"
          AND "end_date" IS NULL;
        GET DIAGNOSTICS affected_rows = ROW_COUNT;

        IF affected_rows = 0 THEN
            INSERT INTO "service_managers" (
                "service_id", "manager_id", "role", "is_primary", "start_date"
            ) VALUES (
                NEW."id", NEW."manager_id", 'Responsable principal', true, NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "services_sync_manager"
AFTER INSERT OR UPDATE OF "manager_id" ON "services"
FOR EACH ROW EXECUTE FUNCTION "sync_service_manager_from_legacy"();

CREATE FUNCTION "sync_service_manager_to_legacy"() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        PERFORM "refresh_service_legacy_manager"(OLD."service_id");
    END IF;
    IF TG_OP <> 'DELETE'
       AND (TG_OP <> 'UPDATE' OR NEW."service_id" IS DISTINCT FROM OLD."service_id") THEN
        PERFORM "refresh_service_legacy_manager"(NEW."service_id");
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "service_managers_sync_legacy"
AFTER INSERT OR UPDATE OR DELETE ON "service_managers"
FOR EACH ROW EXECUTE FUNCTION "sync_service_manager_to_legacy"();

-- Keep the legacy single-service user field and dated membership history in sync.
CREATE FUNCTION "sync_service_members_from_legacy"() RETURNS TRIGGER AS $$
BEGIN
    UPDATE "service_members"
    SET "end_date" = NOW(), "is_active" = false
    WHERE "user_id" = NEW."id"
      AND "end_date" IS NULL
      AND (NEW."service_id" IS NULL OR "service_id" <> NEW."service_id");

    IF NEW."service_id" IS NOT NULL THEN
        INSERT INTO "service_members" ("service_id", "user_id", "position", "is_active")
        VALUES (NEW."service_id", NEW."id", NEW."position", NEW."is_active")
        ON CONFLICT ("service_id", "user_id") WHERE "end_date" IS NULL
        DO UPDATE SET "position" = EXCLUDED."position", "is_active" = EXCLUDED."is_active";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "users_sync_service_members"
AFTER INSERT OR UPDATE OF "service_id", "is_active", "position" ON "users"
FOR EACH ROW EXECUTE FUNCTION "sync_service_members_from_legacy"();

CREATE FUNCTION "refresh_user_legacy_service"(target_user_id INTEGER) RETURNS VOID AS $$
DECLARE
    active_service_id INTEGER;
BEGIN
    SELECT membership."service_id"
    INTO active_service_id
    FROM "service_members" membership
    WHERE membership."user_id" = target_user_id
      AND membership."end_date" IS NULL
    ORDER BY membership."id" DESC
    LIMIT 1;

    UPDATE "users"
    SET "service_id" = active_service_id
    WHERE "id" = target_user_id
      AND "service_id" IS DISTINCT FROM active_service_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "sync_service_member_to_legacy"() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        PERFORM "refresh_user_legacy_service"(OLD."user_id");
    END IF;
    IF TG_OP <> 'DELETE'
       AND (TG_OP <> 'UPDATE' OR NEW."user_id" IS DISTINCT FROM OLD."user_id") THEN
        PERFORM "refresh_user_legacy_service"(NEW."user_id");
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "service_members_sync_legacy"
AFTER INSERT OR UPDATE OR DELETE ON "service_members"
FOR EACH ROW EXECUTE FUNCTION "sync_service_member_to_legacy"();
