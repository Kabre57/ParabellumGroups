const ExcelJS = require('exceljs');

exports.generateExcelReport = async (data, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = options.creator || 'Analytics Service';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(options.sheetName || 'Rapport');

  if (options.title) {
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = options.title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  const startRow = options.title ? 3 : 1;

  if (data.headers) {
    const headerRow = worksheet.getRow(startRow);
    data.headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });
  }

  if (data.rows && data.rows.length > 0) {
    data.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(startRow + rowIndex + 1);
      row.forEach((value, colIndex) => {
        excelRow.getCell(colIndex + 1).value = value;
      });
    });
  }

  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  if (options.autoFilter && data.headers) {
    worksheet.autoFilter = {
      from: { row: startRow, column: 1 },
      to: { row: startRow, column: data.headers.length }
    };
  }

  return workbook;
};

exports.generateMultiSheetReport = async (sheets, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = options.creator || 'Analytics Service';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheetData of sheets) {
    const worksheet = workbook.addWorksheet(sheetData.name || 'Sheet');

    if (sheetData.title) {
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = sheetData.title;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    const startRow = sheetData.title ? 3 : 1;

    if (sheetData.headers) {
      const headerRow = worksheet.getRow(startRow);
      sheetData.headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });
    }

    if (sheetData.rows && sheetData.rows.length > 0) {
      sheetData.rows.forEach((row, rowIndex) => {
        const excelRow = worksheet.getRow(startRow + rowIndex + 1);
        row.forEach((value, colIndex) => {
          excelRow.getCell(colIndex + 1).value = value;
        });
      });
    }

    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  return workbook;
};

exports.writeToFile = async (workbook, filepath) => {
  await workbook.xlsx.writeFile(filepath);
};

exports.writeToBuffer = async (workbook) => {
  return await workbook.xlsx.writeBuffer();
};
