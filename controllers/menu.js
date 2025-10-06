const { Menu } = require("../models/Menu");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Create Menu (Admin only)
const createMenu = async (req, res, next) => {
  try {
    const {
      title,
      url,
      icon,
      isDropdown,
      parent,
      order,
      target,
      type,
      cssClass,
      description
    } = req.body;

    // Validation
    if (!title) {
      throw new CustomError.BadRequestError("Menü başlığı gereklidir");
    }

    // Parent menü kontrolü
    if (parent) {
      const parentMenu = await Menu.findById(parent);
      if (!parentMenu) {
        throw new CustomError.NotFoundError("Ana menü bulunamadı");
      }
      if (parentMenu.parent) {
        throw new CustomError.BadRequestError("Sadece 2 seviye menü desteklenir");
      }
    }

    const menu = new Menu({
      title,
      url: url || "#",
      icon,
      isDropdown: isDropdown || false,
      parent: parent || null,
      order,
      target: target || '_self',
      type: type || 'header',
      cssClass,
      description,
      createdBy: req.user.userId
    });

    await menu.save();

    // Parent menüye alt menü olarak ekle
    if (parent) {
      const parentMenu = await Menu.findById(parent);
      await parentMenu.addChild(menu._id);
    }

    // Populate ile detayları getir
    await menu.populate([
      { path: 'parent', select: 'title url' },
      { path: 'children', select: 'title url icon order isActive' },
      { path: 'createdBy', select: 'name surname' }
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Menü başarıyla oluşturuldu",
      menu
    });
  } catch (error) {
    next(error);
  }
};

// Get All Menus (Public)
const getAllMenus = async (req, res, next) => {
  try {
    const {
      type = 'header',
      includeInactive = false,
      tree = false
    } = req.query;

    let menus;
    
    if (tree === 'true') {
      menus = await Menu.getMenuTree(type);
    } else {
      menus = await Menu.getByType(type, includeInactive === 'true');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      menus
    });
  } catch (error) {
    next(error);
  }
};

// Get Main Menus (Public)
const getMainMenus = async (req, res, next) => {
  try {
    const { type = 'header' } = req.query;

    const menus = await Menu.getMainMenus(type);

    res.status(StatusCodes.OK).json({
      success: true,
      menus
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Menu (Public)
const getSingleMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findById(id)
      .populate('parent', 'title url')
      .populate('children', 'title url icon order isActive target')
      .populate('createdBy', 'name surname');

    if (!menu) {
      throw new CustomError.NotFoundError("Menü bulunamadı");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      menu
    });
  } catch (error) {
    next(error);
  }
};

// Update Menu (Admin only)
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const menu = await Menu.findById(id);
    if (!menu) {
      throw new CustomError.NotFoundError("Menü bulunamadı");
    }

    // Parent menü kontrolü
    if (updates.parent) {
      if (updates.parent === id) {
        throw new CustomError.BadRequestError("Menü kendisinin alt menüsü olamaz");
      }
      
      const parentMenu = await Menu.findById(updates.parent);
      if (!parentMenu) {
        throw new CustomError.NotFoundError("Ana menü bulunamadı");
      }
      if (parentMenu.parent) {
        throw new CustomError.BadRequestError("Sadece 2 seviye menü desteklenir");
      }
    }

    // Güncellenebilir alanlar
    const allowedUpdates = [
      'title', 'url', 'icon', 'isDropdown', 'parent', 'order', 
      'isActive', 'target', 'type', 'cssClass', 'description'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        menu[field] = updates[field];
      }
    });

    await menu.save();

    // Parent menü ilişkilerini güncelle
    if (updates.parent !== undefined) {
      // Eski parent'tan çıkar
      if (menu.parent) {
        const oldParent = await Menu.findById(menu.parent);
        if (oldParent) {
          await oldParent.removeChild(menu._id);
        }
      }
      
      // Yeni parent'a ekle
      if (updates.parent) {
        const newParent = await Menu.findById(updates.parent);
        if (newParent) {
          await newParent.addChild(menu._id);
        }
      }
    }

    // Populate ile detayları getir
    await menu.populate([
      { path: 'parent', select: 'title url' },
      { path: 'children', select: 'title url icon order isActive' },
      { path: 'createdBy', select: 'name surname' }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Menü başarıyla güncellendi",
      menu
    });
  } catch (error) {
    next(error);
  }
};

// Delete Menu (Admin only)
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findById(id);
    if (!menu) {
      throw new CustomError.NotFoundError("Menü bulunamadı");
    }

    // Alt menüleri kontrol et
    if (menu.children && menu.children.length > 0) {
      throw new CustomError.BadRequestError("Alt menüsü olan menü silinemez. Önce alt menüleri silin.");
    }

    // Parent menüden çıkar
    if (menu.parent) {
      const parentMenu = await Menu.findById(menu.parent);
      if (parentMenu) {
        await parentMenu.removeChild(menu._id);
      }
    }

    await Menu.findByIdAndDelete(id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Menü başarıyla silindi"
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Menu Active Status (Admin only)
const toggleMenuActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findById(id);
    if (!menu) {
      throw new CustomError.NotFoundError("Menü bulunamadı");
    }

    await menu.toggleActive();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Menü ${menu.isActive ? 'aktif' : 'pasif'} hale getirildi`,
      menu
    });
  } catch (error) {
    next(error);
  }
};

// Update Menu Order (Admin only)
const updateMenuOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    if (order === undefined || order < 1) {
      throw new CustomError.BadRequestError("Geçerli bir sıralama değeri giriniz");
    }

    const menu = await Menu.updateOrder(id, order);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Menü sıralaması güncellendi",
      menu
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Update Menu Order (Admin only)
const bulkUpdateMenuOrder = async (req, res, next) => {
  try {
    const { menuOrders } = req.body;

    if (!Array.isArray(menuOrders)) {
      throw new CustomError.BadRequestError("Menü sıralamaları array formatında olmalıdır");
    }

    const updatePromises = menuOrders.map(({ id, order }) => 
      Menu.updateOrder(id, order)
    );

    await Promise.all(updatePromises);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Menü sıralamaları başarıyla güncellendi"
    });
  } catch (error) {
    next(error);
  }
};

// Get Menu Statistics (Admin only)
const getMenuStats = async (req, res, next) => {
  try {
    const stats = await Menu.aggregate([
      {
        $group: {
          _id: '$type',
          totalMenus: { $sum: 1 },
          activeMenus: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          dropdownMenus: {
            $sum: { $cond: ['$isDropdown', 1, 0] }
          },
          subMenus: {
            $sum: { $cond: ['$parent', 1, 0] }
          }
        }
      }
    ]);

    const totalStats = await Menu.aggregate([
      {
        $group: {
          _id: null,
          totalMenus: { $sum: 1 },
          activeMenus: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          dropdownMenus: {
            $sum: { $cond: ['$isDropdown', 1, 0] }
          },
          subMenus: {
            $sum: { $cond: ['$parent', 1, 0] }
          }
        }
      }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        byType: stats,
        total: totalStats[0] || {
          totalMenus: 0,
          activeMenus: 0,
          dropdownMenus: 0,
          subMenus: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMenu,
  getAllMenus,
  getMainMenus,
  getSingleMenu,
  updateMenu,
  deleteMenu,
  toggleMenuActive,
  updateMenuOrder,
  bulkUpdateMenuOrder,
  getMenuStats
};
