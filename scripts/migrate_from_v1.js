const path = require('path');
const Database = require('better-sqlite3');
const { createStrapi } = require('@strapi/strapi');

const OLD_DB_PATH = 'd:/ahmed printers/ahmedbillingbackend/.tmp/data.db';

const DEFAULT_QUOTATION_COLUMNS = [
  { id: "col_sno", label: "S.No", key: "sno", align: "center", width: "8%", type: "text" },
  { id: "col_desc", label: "Description / Particulars", key: "description", align: "left", width: "48%", type: "multiline" },
  { id: "col_qty", label: "Qty", key: "qty", align: "center", width: "12%", type: "number" },
  { id: "col_rate", label: "Rate (₹)", key: "rate", align: "right", width: "16%", type: "number" },
  { id: "col_amount", label: "Amount (₹)", key: "amount", align: "right", width: "16%", type: "amount" },
];

function capitalizeFirstLetter(text) {
  if (!text) return "";
  if (typeof text !== "string") return String(text);
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

function formattedAmount(amount) {
  const num = Number(amount);
  const safeAmount = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(safeAmount);
}

async function migrate() {
  console.log('=== STARTING MIGRATION FROM OLD V1 TO V3 ===');
  console.log('Old DB:', OLD_DB_PATH);

  // 1. Open old DB
  const oldDb = new Database(OLD_DB_PATH, { readonly: true });
  console.log('Old database opened successfully.');

  // 2. Start Strapi v5
  console.log('Loading Strapi v5...');
  const strapi = await createStrapi().load();
  console.log('Strapi v5 loaded successfully.');

  // 3. Migrate Admin Users
  console.log('\n--- 1. Migrating Admin Users ---');
  const oldAdminUsers = oldDb.prepare('SELECT * FROM admin_users').all();
  for (const u of oldAdminUsers) {
    const existing = await strapi.db.query('admin::user').findOne({
      where: { email: u.email }
    });
    if (!existing) {
      console.log(`Creating Admin user: ${u.email} (${u.firstname} ${u.lastname})`);
      const createdAdmin = await strapi.db.query('admin::user').create({
        data: {
          firstname: u.firstname,
          lastname: u.lastname,
          username: u.username || undefined,
          email: u.email,
          password: u.password,
          isActive: Boolean(u.is_active),
          blocked: Boolean(u.blocked),
          roles: [1], // Super Admin
        }
      });
      console.log(`Created admin user ID ${createdAdmin.id}`);
    } else {
      console.log(`Admin user ${u.email} already exists.`);
    }
  }

  // 4. Setup Roles & Permissions
  console.log('\n--- 2. Setting up Users-Permissions Roles & Permissions ---');
  const up = strapi.plugin('users-permissions');
  const roleService = up.service('role');

  const existingRoles = await roleService.find();
  let superAdminRole = existingRoles.find(r => r.type === 'superadmin');
  if (!superAdminRole) {
    console.log('Creating superadmin role in users-permissions...');
    superAdminRole = await roleService.createRole({
      name: 'superadmin',
      description: 'Superadmin with full system access',
      type: 'superadmin',
    });
  }

  let adminRole = existingRoles.find(r => r.type === 'admin');
  if (!adminRole) {
    console.log('Creating admin role in users-permissions...');
    adminRole = await roleService.createRole({
      name: 'admin',
      description: 'Admin role',
      type: 'admin',
    });
  }

  // Grant full permissions to superadmin, admin, authenticated, public
  const allRolesToUpdate = await roleService.find();
  for (const role of allRolesToUpdate) {
    const roleDetails = await roleService.findOne(role.id);
    const permissions = roleDetails.permissions;

    // Enable all api permissions for these roles
    let changed = false;
    for (const [key, permGroup] of Object.entries(permissions)) {
      if (key.startsWith('api::') || key === 'plugin::upload' || key === 'plugin::users-permissions') {
        if (permGroup.controllers) {
          for (const [controllerName, actions] of Object.entries(permGroup.controllers)) {
            for (const [actionName, actionConfig] of Object.entries(actions)) {
              if (!actionConfig.enabled) {
                actionConfig.enabled = true;
                changed = true;
              }
            }
          }
        }
      }
    }

    if (changed) {
      await roleService.updateRole(role.id, {
        name: roleDetails.name,
        description: roleDetails.description,
        type: roleDetails.type,
        permissions: permissions
      });
      console.log(`Updated permissions for role: ${role.name} (${role.type})`);
    } else {
      console.log(`Permissions already enabled for role: ${role.name}`);
    }
  }

  // 5. Migrate UP Users
  console.log('\n--- 3. Migrating Users-Permissions Users ---');
  const oldUpUsers = oldDb.prepare('SELECT * FROM up_users').all();
  const refreshedRoles = await roleService.find();
  const roleByType = {};
  for (const r of refreshedRoles) {
    roleByType[r.type] = r;
  }

  for (const u of oldUpUsers) {
    const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: u.email }
    });

    let targetRole = roleByType['superadmin'];
    if (u.username === 'ahmed') {
      targetRole = roleByType['superadmin'] || roleByType['admin'] || roleByType['authenticated'];
    }

    if (!existing) {
      console.log(`Creating UP user: ${u.username} (${u.email}) with role ${targetRole.name}`);
      const createdUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          username: u.username,
          email: u.email,
          provider: u.provider || 'local',
          password: u.password,
          confirmed: true,
          blocked: false,
          role: targetRole.id,
        }
      });
      console.log(`Created UP user ID ${createdUser.id}`);
    } else {
      console.log(`UP user ${u.email} already exists.`);
    }
  }

  // 6. Migrate GST Customers
  console.log('\n--- 4. Migrating GST Customers (27 rows) ---');
  const oldCustomers = oldDb.prepare('SELECT * FROM gstcustomers ORDER BY id ASC').all();
  const customerIdMap = {}; // old_id -> documentId

  for (const c of oldCustomers) {
    const cleanName = capitalizeFirstLetter(c.name.trim());
    const cleanAddress = (c.address || '').trim();
    const cleanDelivery = (c.different_delivery_address || '').trim() || cleanAddress;
    const cleanGstNo = (c.gstno || '').trim().toUpperCase();

    // Check if customer already exists by name or gst_no
    let existingCustomer = await strapi.documents('api::gst-customer.gst-customer').findFirst({
      filters: {
        $or: [
          { name: { $eqi: cleanName } },
          ...(cleanGstNo ? [{ gst_no: { $eqi: cleanGstNo } }] : [])
        ]
      }
    });

    if (!existingCustomer) {
      existingCustomer = await strapi.documents('api::gst-customer.gst-customer').create({
        data: {
          name: cleanName,
          address: cleanAddress,
          delivery_address: cleanDelivery,
          gst_no: cleanGstNo,
          createdAt: new Date(c.created_at).toISOString(),
          updatedAt: new Date(c.updated_at).toISOString(),
        },
        status: 'published'
      });
      console.log(`Created GST Customer [${c.id}]: "${cleanName}" (docId: ${existingCustomer.documentId})`);
    } else {
      console.log(`GST Customer [${c.id}] "${cleanName}" already exists (docId: ${existingCustomer.documentId})`);
    }

    customerIdMap[c.id] = existingCustomer.documentId;
  }

  // 7. Migrate GST Lists (153 rows + 399 components)
  console.log('\n--- 5. Migrating GST Invoices (153 rows) ---');
  const oldGsts = oldDb.prepare('SELECT * FROM gsts ORDER BY serialno ASC, id ASC').all();

  // Prepare component queries
  const getComponentsStmt = oldDb.prepare(`
    SELECT cg.*
    FROM gsts_components gc
    JOIN components_gst_gsts cg ON cg.id = gc.component_id
    WHERE gc.entity_id = ?
    ORDER BY gc."order" ASC
  `);

  const getCustLinkStmt = oldDb.prepare(`
    SELECT gstcustomer_id FROM gsts_gstcustomer_links WHERE gst_id = ? LIMIT 1
  `);

  let gstsCreatedCount = 0;
  for (const g of oldGsts) {
    const billNoStr = String(g.serialno);

    // Check if bill already migrated
    const existingBill = await strapi.documents('api::gst-list.gst-list').findFirst({
      filters: {
        bill_no: { $eq: billNoStr },
        date: { $eq: new Date(g.date).toISOString() }
      }
    });

    if (existingBill) {
      console.log(`GST Bill No ${billNoStr} already exists. Skipping.`);
      continue;
    }

    const custLink = getCustLinkStmt.get(g.id);
    const targetCustDocId = custLink ? customerIdMap[custLink.gstcustomer_id] : null;

    if (!targetCustDocId) {
      console.warn(`WARNING: GST Bill ${billNoStr} (ID: ${g.id}) has no customer mapping!`);
    }

    const rawComponents = getComponentsStmt.all(g.id);
    const sizeData = [];
    const particulars = [];

    for (const comp of rawComponents) {
      const inst = capitalizeFirstLetter(comp.instruction || '');
      const pieceCount = Number(comp.quantity) || 1;
      const perPieceAmnt = Number(comp.per_piece_amnt) || 0;
      const pieceTotalAmnt = Number(comp.piece_total_amount) || 0;

      sizeData.push({
        type: 'instruction',
        instruction: inst,
        piece_count: pieceCount,
        per_piece_amount: perPieceAmnt,
        per_piece_total: pieceTotalAmnt,
        width: 0,
        height: 0,
        sq_ft_price: 0,
        material: ''
      });

      particulars.push({
        text: `${inst} - ${pieceCount} pcs - ${formattedAmount(pieceTotalAmnt)}`
      });
    }

    const baseAmount = Number(g.total_amount) || 0;
    const taxAmount = Number(g.gst_amount) || 0;
    const finalAmount = Number(g.final_amount) || 0;
    const roundOff = Number(g.lessgst) || 0;
    const gstPct = Number(g.gstpercentage) || 18.0;

    const createdGst = await strapi.documents('api::gst-list.gst-list').create({
      data: {
        bill_no: billNoStr,
        date: new Date(g.date).toISOString(),
        hsn_code: String(g.hsn || '9989'),
        uom: g.uom || 'NOS',
        method: 'gst',
        gst_percentage: gstPct,
        base_amount: baseAmount,
        tax_amount: taxAmount,
        total_amount: finalAmount,
        round_off: roundOff,
        current_status: g.status || 'status',
        received_amount: g.gstrecieved_amount ? Number(g.gstrecieved_amount) : null,
        received_method: g.recievedin || null,
        received_bill_nos: g.recv_billnos ? JSON.parse(g.recv_billnos) : null,
        gst_customer: targetCustDocId,
        size_data: sizeData,
        particulars: particulars,
        createdAt: new Date(g.created_at).toISOString(),
        updatedAt: new Date(g.updated_at).toISOString(),
      },
      status: 'published'
    });

    gstsCreatedCount++;
    if (gstsCreatedCount % 25 === 0 || gstsCreatedCount === oldGsts.length) {
      console.log(`Migrated ${gstsCreatedCount}/${oldGsts.length} GST invoices...`);
    }
  }

  // 8. Migrate Quotations (5 rows + 34 components)
  console.log('\n--- 6. Migrating Quotations (5 rows) ---');
  const oldQuotations = oldDb.prepare('SELECT * FROM quotations ORDER BY id ASC').all();

  const getQuotationComponentsStmt = oldDb.prepare(`
    SELECT c.*
    FROM quotations_components qc
    JOIN components_quotation_sizesettings c ON c.id = qc.component_id
    WHERE qc.entity_id = ?
    ORDER BY qc."order" ASC
  `);

  let quotationsCreatedCount = 0;
  for (const q of oldQuotations) {
    const qYear = new Date(q.date).getFullYear();
    const qNo = `QT-${qYear}-${String(q.id).padStart(3, '0')}`;

    const existingQ = await strapi.documents('api::quotation.quotation').findFirst({
      filters: {
        quotationNo: { $eq: qNo }
      }
    });

    if (existingQ) {
      console.log(`Quotation ${qNo} already exists. Skipping.`);
      continue;
    }

    const rawComps = getQuotationComponentsStmt.all(q.id);
    const rows = rawComps.map((comp, idx) => ({
      id: `row_${Date.now()}_${idx + 1}`,
      sno: String(idx + 1),
      description: comp.instruction || '',
      qty: String(comp.piece_count || ''),
      rate: String(comp.sq_ft_price || ''),
      amount: String(comp.total || ''),
    }));

    const dateStr = new Date(q.date).toISOString().split('T')[0];
    const createdQ = await strapi.documents('api::quotation.quotation').create({
      data: {
        quotationNo: qNo,
        date: dateStr,
        customerName: q.to || '',
        address: q.address || '',
        phone: '',
        topText: q.subject || '',
        columns: DEFAULT_QUOTATION_COLUMNS,
        rows: rows,
        taxPercent: 0,
        discountAmount: Number(q.less) || 0,
        bottomText: q.extracontent || '',
        grandTotal: Number(q.final_amount) || 0,
        createdAt: new Date(q.created_at).toISOString(),
        updatedAt: new Date(q.updated_at).toISOString(),
      },
      status: 'published'
    });

    quotationsCreatedCount++;
    console.log(`Created quotation ${qNo} for customer "${q.to}" (grand total: ₹${q.final_amount})`);
  }

  // 9. Verification & Audit
  console.log('\n--- 7. Verification & Audit ---');
  const custCount = await strapi.documents('api::gst-customer.gst-customer').count();
  const gstCount = await strapi.documents('api::gst-list.gst-list').count();
  const qCount = await strapi.documents('api::quotation.quotation').count();
  const adminCount = await strapi.db.query('admin::user').count();
  const upUserCount = await strapi.db.query('plugin::users-permissions.user').count();

  console.log(`Total GST Customers in v3: ${custCount} (expected: 27)`);
  console.log(`Total GST Invoices in v3: ${gstCount} (expected: 153)`);
  console.log(`Total Quotations in v3: ${qCount} (expected: 5)`);
  console.log(`Total Admin Users in v3: ${adminCount} (expected: >= 1)`);
  console.log(`Total App Users in v3: ${upUserCount} (expected: >= 2)`);

  const sampleGst = await strapi.documents('api::gst-list.gst-list').findFirst({
    populate: ['gst_customer', 'size_data', 'particulars']
  });
  console.log('\nSample GST bill verified:');
  console.log(`  Bill No: ${sampleGst?.bill_no}`);
  console.log(`  Date: ${sampleGst?.date}`);
  console.log(`  Customer: ${sampleGst?.gst_customer?.name}`);
  console.log(`  Size Items: ${sampleGst?.size_data?.length}`);
  console.log(`  Particulars: ${sampleGst?.particulars?.[0]?.text}`);
  console.log(`  Total Amount: ₹${sampleGst?.total_amount}`);

  console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY! ===');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n*** MIGRATION FAILED ***', err);
  process.exit(1);
});
